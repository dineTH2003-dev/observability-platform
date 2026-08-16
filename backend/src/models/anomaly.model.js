const db = require("../config/db");
const cache = require("../utils/cache");

const ANOMALY_CACHE_PREFIX = 'anomalies:';
const ANOMALY_LIST_TTL_MS = 10_000; // 10 seconds

// Create a new anomaly record
exports.create = async (data, client = db) => {
  const {
    server_id,
    service_id,
    application_id,
    anomaly_type,
    severity,
    title,
    description,
    metric_value,
    threshold,
    detected_at,
  } = data;

  const { rows } = await db.query(
    `INSERT INTO anomalies
       (server_id, service_id, application_id, anomaly_type, severity, title, description, metric_value, threshold, detected_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10, NOW()))
     RETURNING *`,
    [
      server_id ?? null,
      service_id ?? null,
      application_id ?? null,
      anomaly_type,
      severity,
      title,
      description ?? null,
      metric_value ?? null,
      threshold ?? null,
      detected_at ?? null,
    ],
  );
  // Invalidate list cache — new anomaly was just created.
  cache.invalidate(`${ANOMALY_CACHE_PREFIX}*`);
  return rows[0];
};

exports.createMlDetails = async (anomalyId, data, client = db) => {
  const {
    model_id,
    entity_type,
    detector_name,
    score,
    confidence,
    window_start,
    window_end,
    expected_value,
    lower_bound,
    upper_bound,
    feature_values,
    reason_codes,
    fingerprint,
    suppression_reason,
  } = data;

  const { rows } = await client.query(
    `INSERT INTO anomaly_ml_details
       (anomaly_id, model_id, entity_type, detector_name, score, confidence,
        window_start, window_end, expected_value, lower_bound, upper_bound,
        feature_values, reason_codes, fingerprint, suppression_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::text[],$14,$15)
     RETURNING *`,
    [
      anomalyId,
      model_id ?? null,
      entity_type,
      detector_name,
      score ?? null,
      confidence ?? null,
      window_start ?? null,
      window_end ?? null,
      expected_value ?? null,
      lower_bound ?? null,
      upper_bound ?? null,
      JSON.stringify(feature_values ?? {}),
      reason_codes ?? [],
      fingerprint,
      suppression_reason ?? null,
    ],
  );
  return rows[0];
};

exports.findDuplicateByFingerprint = async (fingerprint) => {
  const { rows } = await db.query(
    `SELECT a.*, d.detector_name, d.score, d.confidence, d.fingerprint
     FROM anomaly_ml_details d
     JOIN anomalies a ON a.anomaly_id = d.anomaly_id
     WHERE d.fingerprint = $1
     ORDER BY a.detected_at DESC
     LIMIT 1`,
    [fingerprint],
  );
  return rows[0];
};

// Get all anomalies, newest first
exports.findAll = async ({ status, severity, assignedToUserId, limit = 100 } = {}) => {
  const cacheKey = `${ANOMALY_CACHE_PREFIX}list:${status}:${severity}:${assignedToUserId}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }

  if (severity) {
    params.push(severity);
    conditions.push(`a.severity = $${params.length}`);
  }

  if (assignedToUserId) {
    params.push(assignedToUserId);
    conditions.push(`i.assigned_to = $${params.length}`);
  }

  params.push(Math.min(Number(limit) || 100, 500));

  const { rows } = await db.query(
    `SELECT a.*,
            s.hostname  AS server_name,
            svc.name    AS service_name,
            app.name    AS application_name,
            i.assigned_to,
            i.incident_number,
            u.email AS assigned_email,
            d.detector_name,
            d.score,
            d.confidence,
            d.window_start,
            d.window_end,
            d.expected_value,
            d.lower_bound,
            d.upper_bound,
            d.reason_codes,
            d.fingerprint,
            d.suppression_reason
     FROM anomalies a
     LEFT JOIN servers      s   ON a.server_id  = s.server_id
     LEFT JOIN services     svc ON a.service_id = svc.service_id
     LEFT JOIN applications app ON a.application_id = app.application_id
     LEFT JOIN incidents    i   ON a.incident_id = i.incident_id
     LEFT JOIN users        u   ON i.assigned_to = u.id
     LEFT JOIN anomaly_ml_details d ON a.anomaly_id = d.anomaly_id
     ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
     ORDER BY a.detected_at DESC
     LIMIT $${params.length}`,
    params,
  );
  cache.set(cacheKey, rows, ANOMALY_LIST_TTL_MS);
  return rows;
};

// Get a single anomaly by ID
exports.findById = async (id) => {
  const { rows } = await db.query(
    `SELECT a.*,
            s.hostname AS server_name,
            svc.name AS service_name,
            app.name AS application_name,
            i.assigned_to,
            i.incident_number,
            u.email AS assigned_email,
            d.model_id,
            d.entity_type,
            d.detector_name,
            d.score,
            d.confidence,
            d.window_start,
            d.window_end,
            d.expected_value,
            d.lower_bound,
            d.upper_bound,
            d.feature_values,
            d.reason_codes,
            d.fingerprint,
            d.suppression_reason
     FROM anomalies a
     LEFT JOIN servers s ON a.server_id = s.server_id
     LEFT JOIN services svc ON a.service_id = svc.service_id
     LEFT JOIN applications app ON a.application_id = app.application_id
     LEFT JOIN incidents i ON a.incident_id = i.incident_id
     LEFT JOIN users u ON i.assigned_to = u.id
     LEFT JOIN anomaly_ml_details d ON a.anomaly_id = d.anomaly_id
     WHERE a.anomaly_id = $1`,
    [id],
  );
  const anomaly = rows[0];
  if (!anomaly) return null;

  const { rows: feedback } = await db.query(
    `SELECT f.*, u.email AS created_by_email
     FROM anomaly_feedback f
     LEFT JOIN users u ON f.created_by = u.id
     WHERE f.anomaly_id = $1
     ORDER BY f.created_at DESC`,
    [id],
  );
  anomaly.feedback = feedback;
  return anomaly;
};

// Link an anomaly to an incident
exports.linkToIncident = async (anomalyId, incidentId, client = db) => {
  const { rows } = await client.query(
    `UPDATE anomalies SET incident_id = $1 WHERE anomaly_id = $2 RETURNING *`,
    [incidentId, anomalyId],
  );
  return rows[0];
};

// Update anomaly status (e.g. when incident is resolved)
exports.updateStatus = async (id, status, resolvedAt = null) => {
  const { rows } = await db.query(
    `UPDATE anomalies SET status = $1, resolved_at = $2 WHERE anomaly_id = $3 RETURNING *`,
    [status, resolvedAt, id],
  );
  // Invalidate list cache — status changed.
  cache.invalidate(`${ANOMALY_CACHE_PREFIX}*`);
  return rows[0];
};

exports.addFeedback = async ({ anomaly_id, label, comment, created_by }) => {
  const { rows } = await db.query(
    `INSERT INTO anomaly_feedback (anomaly_id, label, comment, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [anomaly_id, label, comment ?? null, created_by ?? null],
  );
  return rows[0];
};
