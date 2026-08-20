const { GoogleGenAI } = require('@google/genai');

/**
 * Service to generate AI recommendations for incidents using Gemini AI.
 * 
 * Requirements enforced:
 * - Analyzes incident title, severity, status, entity, and triggered anomalies.
 * - Generates prompt (payload) and requests analysis from Gemini AI.
 * - Returns ONLY recommended_next_steps (array of strings) and rationale (string).
 * - Does NOT update the database or write to the activity timeline.
 */

/**
 * Build automatic prompt payload for Gemini AI based on incident context.
 */
function buildIncidentPrompt(incident) {
  const anomaliesSummary = Array.isArray(incident.anomalies) && incident.anomalies.length > 0
    ? incident.anomalies.map(a => `- Anomaly Type: ${a.anomaly_type || 'Unknown'}, Metric Value: ${a.metric_value ?? 'N/A'}, Threshold: ${a.threshold ?? 'N/A'}, Detected: ${a.detected_at || 'N/A'}`).join('\n')
    : 'No specific anomaly telemetry recorded.';

  return `
You are an expert AIOps and Site Reliability Engineering (SRE) Incident Analysis Engine.
Analyze the following system incident automatically created by the observability system:

INCIDENT DETAILS:
- Incident ID: ${incident.incident_id || 'N/A'} (INC-${incident.incident_number || '000'})
- Title: ${incident.title || 'Untitled Incident'}
- Severity: ${(incident.severity || 'medium').toUpperCase()}
- Status: ${incident.status || 'open'}
- Assigned Engineer: ${incident.assigned_email || incident.assigned_to || 'Unassigned'}
- Description: ${incident.description || 'N/A'}

TRIGGERED ANOMALIES & TELEMETRY:
${anomaliesSummary}

TASK:
Generate specific, actionable recommendations for resolving this incident.
Your response MUST be valid JSON containing ONLY the following two fields:
1. "recommended_next_steps": An array of clear, step-by-step actionable instructions for the on-call engineer to troubleshoot and remediate the issue.
2. "rationale": A clear explanation of why these specific next steps are recommended, based on the incident severity, root cause hypothesis, and system impact.

CRITICAL INSTRUCTIONS:
- Do NOT output any markdown formatting (no \`\`\`json wrappers).
- Do NOT output extra text or extra JSON keys.
- Output strictly raw valid JSON.
`;
}

/**
 * Generate fallback recommendations based on incident telemetry if Gemini API key is unavailable or fails.
 */
function generateFallbackRecommendation(incident) {
  const title = (incident.title || '').toLowerCase();
  const severity = (incident.severity || 'medium').toUpperCase();

  let nextSteps = [];
  let rationale = '';

  if (title.includes('cpu') || title.includes('processor')) {
    nextSteps = [
      'Inspect high-CPU processes using system diagnostics (`top -c` or `htop`).',
      'Check recent code deployments and background job queues for infinite loops or unthrottled worker tasks.',
      'Scale up application server instances or apply rate-limiting to incoming traffic if load exceeds normal operating thresholds.'
    ];
    rationale = `High CPU utilization (${severity} severity) severely impacts request processing latency and risk thread pool exhaustion. Immediate process identification and load rebalancing will stabilize server capacity.`;
  } else if (title.includes('memory') || title.includes('ram') || title.includes('oom')) {
    nextSteps = [
      'Examine heap memory consumption and garbage collection metrics for memory leaks.',
      'Check system log files (`/var/log/messages` or application logs) for Out-Of-Memory (OOM) killer events.',
      'Restart the impacted application container/service and temporarily increase memory allocation limit.'
    ];
    rationale = `Memory exhaustion can cause unpredictable service crashes or system-wide kernel panics. Restarting the process while capturing heap dumps isolates the leak while restoring service availability.`;
  } else if (title.includes('disk') || title.includes('storage')) {
    nextSteps = [
      'Run `df -h` and `du -sh` to identify large log files or temporary artifact directories consuming disk space.',
      'Truncate or compress obsolete log files and clear temporary system caches.',
      'Configure automated log rotation and expand disk volume capacity if growth persists.'
    ];
    rationale = `Low available storage risks database write failures and corrupt log generation. Clearing temporary files immediately restores write operations.`;
  } else if (title.includes('metric') || title.includes('unusual') || title.includes('anomaly')) {
    nextSteps = [
      'Cross-examine correlated metric time series graphs (CPU, Memory, I/O, Network) during the anomaly window.',
      'Review service dependency health logs to determine if upstream/downstream services are experiencing degradation.',
      'Verify recent configuration changes or deployment events near the incident timestamp.'
    ];
    rationale = `Unusual multi-metric behavior points to abnormal workload spikes or service inter-dependency bottlenecks. Correlating telemetry isolates whether the fault is internal or cascading from dependent components.`;
  } else {
    nextSteps = [
      'Review live application logs and error traces around the time of incident creation.',
      'Verify service network connectivity, database connection pool usage, and API response status codes.',
      'Acknowledge the incident and notify relevant domain owners if escalation is required.'
    ];
    rationale = `Automated incident detection indicates anomalous telemetry for ${incident.title || 'this component'}. Following standard triage procedures ensures rapid containment and minimal downtime.`;
  }

  return {
    recommended_next_steps: nextSteps,
    rationale: rationale
  };
}

/**
 * Main function to generate incident recommendations using Gemini AI.
 */
async function generateIncidentRecommendation(incident) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_gemini_api_key') {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const prompt = buildIncidentPrompt(incident);

      // Call Gemini 2.5 Flash model
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let text = response?.text || '';
      // Clean possible markdown code fences
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.recommended_next_steps) && typeof parsed.rationale === 'string') {
        return {
          recommended_next_steps: parsed.recommended_next_steps,
          rationale: parsed.rationale
        };
      }
    } catch (err) {
      console.warn('[Gemini AI] Call failed or response invalid, using SRE analyzer fallback:', err.message);
    }
  }

  // Fallback to SRE recommendation engine
  return generateFallbackRecommendation(incident);
}

module.exports = {
  generateIncidentRecommendation,
  buildIncidentPrompt,
};
