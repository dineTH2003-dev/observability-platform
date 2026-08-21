const db = require("../config/db");
const AnomalyModel = require("../models/anomaly.model");
const IncidentModel = require("../models/incident.model");
const TimelineModel = require("../models/incident_timeline.model");
const ApiError = require("../utils/apiError");
const { broadcastAnomalyEvent, broadcastIncidentEvent } = require("../socket");

const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_STATUSES = new Set(["detected", "assigned", "acknowledged", "resolved"]);

exports.getAnomalies = async (filters = {}, user = null) => {
  return AnomalyModel.findAll(filters);
};

exports.getAnomalyById = async (id, user = null) => {
  const anomaly = await AnomalyModel.findById(id);
  if (!anomaly) throw new ApiError(404, "Anomaly not found");
  return anomaly;
};

exports.updateStatus = async (id, status, user = null) => {
  if (!VALID_STATUSES.has(status)) {
    throw new ApiError(400, "Invalid anomaly status");
  }

  await exports.getAnomalyById(id, user);

  const resolvedAt = status === "resolved" ? new Date() : null;
  const updated = await AnomalyModel.updateStatus(id, status, resolvedAt);
  if (!updated) throw new ApiError(404, "Anomaly not found");

  try {
    const cache = require("../utils/cache");
    cache.invalidate("route:/api/anomalies*", "route:/api/dashboard*", "route:/api/incidents*").catch(() => {});
  } catch (err) {}

  return updated;
};

exports.addFeedback = async (id, data, user) => {
  await exports.getAnomalyById(id, user);

  const label = data.label;
  if (!["true_positive", "false_positive", "expected_change", "duplicate", "unknown"].includes(label)) {
    throw new ApiError(400, "Invalid feedback label");
  }

  return AnomalyModel.addFeedback({
    anomaly_id: id,
    label,
    comment: data.comment,
    created_by: user?.userId ?? null,
  });
};

function isAdmin(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

function ensureCanAccessAnomaly(anomaly, user) {
  if (isAdmin(user)) return;
  if (anomaly.assigned_to && String(anomaly.assigned_to) === String(user?.userId)) return;
  throw new ApiError(404, "Anomaly not found");
}

exports.createFromMlDetection = async (payload) => {
  const normalized = await normalizeMlPayload(payload);
  const duplicate = await AnomalyModel.findDuplicateByFingerprint(normalized.ml.fingerprint);
  if (duplicate) {
    return {
      anomaly: duplicate,
      incident: null,
      duplicate: true,
      suppressed: Boolean(duplicate.suppression_reason),
      incident_created: false,
    };
  }

  const suppressionReason = normalized.ml.suppression_reason || (await findSuppressionReason(normalized));
  const shouldCreateIncident = shouldCreateIncidentFor(normalized, suppressionReason);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const anomaly = await AnomalyModel.create(normalized.anomaly, client);
    const details = await AnomalyModel.createMlDetails(
      anomaly.anomaly_id,
      {
        ...normalized.ml,
        suppression_reason: suppressionReason,
      },
      client,
    );

    let incident = null;
    if (shouldCreateIncident) {
      incident = await IncidentModel.create(
        {
          title: normalized.anomaly.title,
          description: normalized.anomaly.description,
          severity: normalized.anomaly.severity,
        },
        client,
      );

      await AnomalyModel.linkToIncident(anomaly.anomaly_id, incident.incident_id, client);
      await TimelineModel.addEvent(
        incident.incident_id,
        null,
        "created",
        `Incident auto-created from ${normalized.anomaly.anomaly_type} ML anomaly (value: ${normalized.anomaly.metric_value ?? "N/A"})`,
        client,
      );
      anomaly.incident_id = incident.incident_id;
    }

    await client.query("COMMIT");

    // ── AI Recommendation (fire-and-forget, after commit) ──
    if (incident) {
      try {
        const recommendationService = require("./recommendation.service");
        // Enrich the anomaly object with ml_details for a richer prompt
        const enrichedAnomaly = {
          ...anomaly,
          ...normalized.ml,
        };
        recommendationService.generateAndAttach(enrichedAnomaly, incident).catch(() => {});
      } catch (err) {
        // Never block incident creation
      }
    }

    // Trigger Notification Service
    try {
      const notificationService = require('./notification.service');
      notificationService.notifyAnomalyDetected(incident, anomaly).catch(err => {
        console.error("notifyAnomalyDetected failed:", err.message);
      });
    } catch (err) {
      console.error("Failed to load notificationService:", err.message);
    }

    // Invalidate cache so GET /api/anomalies & /api/incidents reflect the new record
    try {
      const cache = require("../utils/cache");
      cache.invalidate("route:/api/anomalies*", "route:/api/dashboard*", "route:/api/incidents*").catch(() => {});
    } catch (err) {}

    // ── Real-time broadcast ──
    try {
      const fullAnomaly = await AnomalyModel.findById(anomaly.anomaly_id);
      broadcastAnomalyEvent('anomaly_created', fullAnomaly || { ...anomaly, ml_details: details });
      if (incident) {
        const fullIncident = await IncidentModel.findById(incident.incident_id);
        broadcastIncidentEvent('incident_created', fullIncident || incident);
        console.log(`[Socket] incident_created broadcast: INC-${(fullIncident || incident).incident_number}, severity=${(fullIncident || incident).severity}`);
      }
    } catch (err) {
      console.error("Socket broadcast failed (anomaly_created):", err.message);
    }

    return {
      anomaly: {
        ...anomaly,
        ml_details: details,
      },
      incident,
      duplicate: false,
      suppressed: Boolean(suppressionReason),
      incident_created: Boolean(incident),
    };
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      const existing = await AnomalyModel.findDuplicateByFingerprint(normalized.ml.fingerprint);
      if (existing) {
        return {
          anomaly: existing,
          incident: null,
          duplicate: true,
          suppressed: Boolean(existing.suppression_reason),
          incident_created: false,
        };
      }
    }

    throw err;
  } finally {
    client.release();
  }
};

async function normalizeMlPayload(payload) {
  const anomalyType = String(payload.anomaly_type || payload.metric_name || "").trim();
  if (!anomalyType) throw new ApiError(400, "anomaly_type is required");

  const severity = normalizeSeverity(payload.severity);
  const entityType = inferEntityType(payload);
  const detectorName = String(payload.detector_name || "unknown_detector").trim();
  const windowStart = payload.window_start || payload.detected_at || new Date().toISOString();
  const windowEnd = payload.window_end || payload.detected_at || new Date().toISOString();

  const applicationId = payload.application_id ?? (await resolveApplicationId(payload));
  const fingerprint = payload.fingerprint || buildFingerprint({
    entityType,
    serverId: payload.server_id,
    serviceId: payload.service_id,
    applicationId,
    anomalyType,
    detectorName,
    windowStart,
  });

  return {
    anomaly: {
      server_id: payload.server_id ?? null,
      service_id: payload.service_id ?? null,
      application_id: applicationId ?? null,
      anomaly_type: anomalyType.toUpperCase(),
      severity,
      title: payload.title || buildTitle(payload, anomalyType),
      description: payload.description || buildDescription(payload),
      metric_value: payload.metric_value ?? null,
      threshold: payload.threshold ?? payload.upper_bound ?? null,
      detected_at: payload.detected_at ?? windowEnd,
    },
    ml: {
      model_id: payload.model_id ?? null,
      entity_type: entityType,
      detector_name: detectorName,
      score: payload.score ?? null,
      confidence: payload.confidence ?? null,
      window_start: windowStart,
      window_end: windowEnd,
      expected_value: payload.expected_value ?? null,
      lower_bound: payload.lower_bound ?? null,
      upper_bound: payload.upper_bound ?? null,
      feature_values: payload.feature_values ?? {},
      reason_codes: Array.isArray(payload.reason_codes) ? payload.reason_codes : [],
      fingerprint,
      suppression_reason: payload.suppression_reason ?? null,
    },
    auto_create_incident: payload.auto_create_incident,
  };
}

function normalizeSeverity(severity) {
  if (severity === "warning") return "medium";
  const value = String(severity || "medium").toLowerCase();
  if (!VALID_SEVERITIES.has(value)) {
    throw new ApiError(400, "Invalid anomaly severity");
  }
  return value;
}

function inferEntityType(payload) {
  if (payload.entity_type) {
    const value = String(payload.entity_type).toLowerCase();
    if (!["server", "service", "application"].includes(value)) {
      throw new ApiError(400, "Invalid entity_type");
    }
    return value;
  }
  if (payload.service_id) return "service";
  if (payload.application_id) return "application";
  if (payload.server_id) return "server";
  throw new ApiError(400, "One of server_id, service_id, or application_id is required");
}

async function resolveApplicationId(payload) {
  if (!payload.service_id) return null;
  const { rows } = await db.query(
    `SELECT application_id FROM services WHERE service_id = $1`,
    [payload.service_id],
  );
  return rows[0]?.application_id ?? null;
}

function buildFingerprint({
  entityType,
  serverId,
  serviceId,
  applicationId,
  anomalyType,
  detectorName,
  windowStart,
}) {
  const entityId = serviceId ?? applicationId ?? serverId;
  const rounded = new Date(windowStart);
  rounded.setSeconds(0, 0);
  return `${entityType}:${entityId}:${anomalyType.toUpperCase()}:${detectorName}:${rounded.toISOString()}`;
}

function buildTitle(payload, anomalyType) {
  const entity = payload.service_id ? `service ${payload.service_id}` : payload.server_id ? `server ${payload.server_id}` : `application ${payload.application_id}`;
  return `${anomalyType.toUpperCase()} anomaly detected on ${entity}`;
}

function buildDescription(payload) {
  const parts = [];
  if (payload.metric_value != null) parts.push(`metric value=${payload.metric_value}`);
  if (payload.expected_value != null) parts.push(`expected=${payload.expected_value}`);
  if (payload.lower_bound != null || payload.upper_bound != null) {
    parts.push(`normal range=${payload.lower_bound ?? "N/A"} to ${payload.upper_bound ?? "N/A"}`);
  }
  if (payload.score != null) parts.push(`score=${payload.score}`);
  return parts.length ? parts.join("; ") : null;
}

async function findSuppressionReason(normalized) {
  const { anomaly } = normalized;
  const entityClauses = [
    ["server", anomaly.server_id],
    ["service", anomaly.service_id],
    ["application", anomaly.application_id],
    ["global", null],
  ].filter(([, id], index) => index === 3 || id != null);

  const now = anomaly.detected_at || new Date();
  const params = [now];
  const conditions = entityClauses.map(([entityType, entityId]) => {
    params.push(entityType);
    const typeParam = params.length;

    if (entityId == null) {
      return `(entity_type = $${typeParam})`;
    }

    params.push(entityId);
    const idParam = params.length;
    return `(entity_type = $${typeParam} AND entity_id = $${idParam})`;
  });

  const { rows: maintenance } = await db.query(
    `SELECT reason
     FROM maintenance_windows
     WHERE $1 BETWEEN starts_at AND ends_at
       AND (${conditions.join(" OR ")})
     ORDER BY starts_at DESC
     LIMIT 1`,
    params,
  );

  if (maintenance[0]) {
    return maintenance[0].reason ? `maintenance: ${maintenance[0].reason}` : "maintenance_window";
  }

  const { rows: deployments } = await db.query(
    `SELECT deployment_id
     FROM deployment_events
     WHERE deployed_at >= $1::timestamptz - INTERVAL '30 minutes'
       AND (
         ($2::int IS NOT NULL AND server_id = $2)
         OR ($3::int IS NOT NULL AND service_id = $3)
         OR ($4::int IS NOT NULL AND application_id = $4)
       )
     ORDER BY deployed_at DESC
     LIMIT 1`,
    [now, anomaly.server_id, anomaly.service_id, anomaly.application_id],
  );

  return deployments[0] ? "recent_deployment" : null;
}

function shouldCreateIncidentFor(normalized, suppressionReason) {
  if (suppressionReason) return false;
  if (normalized.auto_create_incident === false) return false;
  // Every anomaly — regardless of severity — auto-creates an incident.
  return true;
}
