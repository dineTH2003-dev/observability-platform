/**
 * recommendation.service.js
 *
 * Generates a concise, actionable AI recommendation for an anomaly/incident
 * using the Google Gemini API (gemini-2.0-flash).
 *
 * Design:
 *  - Uses raw fetch (no new npm deps)
 *  - Fire-and-forget: called after the anomaly/incident transaction commits
 *  - Gracefully skips if GEMINI_API_KEY is not set
 *  - Stores result in incidents.ai_recommendation (JSONB)
 */

const db = require("../config/db");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

/**
 * Build a structured, compact prompt from anomaly data.
 */
function buildPrompt(anomaly) {
  const type = anomaly.anomaly_type || "UNKNOWN";
  const severity = anomaly.severity || "medium";
  const entityType = anomaly.entity_type || "unknown entity";
  const metricValue = anomaly.metric_value != null ? anomaly.metric_value : "N/A";
  const expectedValue = anomaly.expected_value != null ? anomaly.expected_value : "N/A";
  const lowerBound = anomaly.lower_bound != null ? anomaly.lower_bound : "N/A";
  const upperBound = anomaly.upper_bound != null ? anomaly.upper_bound : "N/A";
  const detectorName = anomaly.detector_name || "unknown";
  const reasonCodes = Array.isArray(anomaly.reason_codes) && anomaly.reason_codes.length
    ? anomaly.reason_codes.join(", ")
    : "none";
  const description = anomaly.description || "";

  return `You are a senior Site Reliability Engineer (SRE) assistant analyzing a production system anomaly.

Anomaly Type: ${type}
Entity: ${entityType} (severity: ${severity})
Observed metric value: ${metricValue}
Expected value: ${expectedValue}
Normal range: ${lowerBound} – ${upperBound}
Detector: ${detectorName}
Reason codes: ${reasonCodes}
${description ? `Description: ${description}` : ""}

Respond with ONLY a valid JSON object. No markdown. No explanation. No text outside the JSON.

The JSON must follow this exact shape:
{
  "cause": "One concise sentence describing the most likely root cause",
  "actions": ["Immediate action step 1", "Follow-up action step 2", "Preventive action step 3"],
  "impact": "One sentence on what resolving this issue will achieve",
  "confidence": "High"
}

Rules:
- "cause" must be one sentence, specific to the anomaly type and metrics
- "actions" must contain exactly 3 concrete, technical steps an engineer can take right now
- "impact" must describe the operational benefit of resolution
- "confidence" must be exactly one of: "High", "Medium", "Low"`;
}

/**
 * Call the Gemini API with the given prompt.
 * Returns parsed { cause, actions, impact, confidence } or throws.
 */
async function callGeminiApi(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error("GEMINI_API_KEY not configured — skipping recommendation");
  }

  const url = `${GEMINI_API_URL}?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Strip any accidental markdown fences
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  // Validate and normalise the shape
  const cause = String(parsed.cause || "").trim();
  const actions = Array.isArray(parsed.actions)
    ? parsed.actions.map((a) => String(a).trim()).filter(Boolean).slice(0, 5)
    : [];
  const impact = String(parsed.impact || "").trim();
  const rawConfidence = String(parsed.confidence || "").trim();
  const confidence = ["High", "Medium", "Low"].includes(rawConfidence)
    ? rawConfidence
    : "Medium";

  if (!cause || actions.length === 0) {
    throw new Error("Gemini response missing required fields");
  }

  return { cause, actions, impact, confidence };
}

/**
 * Persist the recommendation to the incidents table.
 */
async function saveRecommendation(incidentId, recommendation) {
  await db.query(
    `UPDATE incidents
     SET ai_recommendation = $1, updated_at = NOW()
     WHERE incident_id = $2`,
    [JSON.stringify(recommendation), incidentId]
  );
}

/**
 * Main entry point — generate a recommendation for an anomaly and attach it
 * to the linked incident. Designed to be called fire-and-forget.
 *
 * @param {object} anomaly   - Anomaly record (or ml_details-enriched object)
 * @param {object} incident  - Incident record with at least { incident_id }
 */
exports.generateAndAttach = async (anomaly, incident) => {
  if (!incident?.incident_id) return;

  try {
    const prompt = buildPrompt(anomaly);
    const recommendation = await callGeminiApi(prompt);
    await saveRecommendation(incident.incident_id, recommendation);
    console.log(
      `[Recommendation] Generated for incident ${incident.incident_id}: confidence=${recommendation.confidence}`
    );
  } catch (err) {
    // Graceful degradation — never block incident creation
    console.warn(`[Recommendation] Skipped for incident ${incident.incident_id}: ${err.message}`);
  }
};

/**
 * On-demand: fetch the linked anomaly for an incident, generate a fresh
 * recommendation, persist it, and return the full recommendation object.
 *
 * @param {string} incidentId
 * @returns {object} recommendation { cause, actions, impact, confidence }
 */
exports.generateForIncident = async (incidentId) => {
  // Fetch the linked anomaly with its ML details
  const { rows: anomalyRows } = await db.query(
    `SELECT
       a.anomaly_type,
       a.severity,
       a.metric_value,
       a.threshold,
       a.description,
       amd.entity_type,
       amd.detector_name,
       amd.expected_value,
       amd.lower_bound,
       amd.upper_bound,
       amd.reason_codes
     FROM anomalies a
     LEFT JOIN anomaly_ml_details amd ON amd.anomaly_id = a.anomaly_id
     WHERE a.incident_id = $1
     ORDER BY a.detected_at DESC
     LIMIT 1`,
    [incidentId]
  );

  if (!anomalyRows[0]) {
    throw new Error("No anomaly linked to this incident");
  }

  const prompt = buildPrompt(anomalyRows[0]);
  const recommendation = await callGeminiApi(prompt);
  await saveRecommendation(incidentId, recommendation);

  console.log(
    `[Recommendation] Regenerated for incident ${incidentId}: confidence=${recommendation.confidence}`
  );

  return recommendation;
};
