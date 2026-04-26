const db = require('../config/db');

// Create a new anomaly record
exports.create = async (data) => {
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
  } = data;

  const { rows } = await db.query(
    `INSERT INTO anomalies
       (server_id, service_id, application_id, anomaly_type, severity, title, description, metric_value, threshold)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [server_id || null, service_id || null, application_id || null, anomaly_type, severity, title, description || null, metric_value || null, threshold || null]
  );
  return rows[0];
};

// Get all anomalies, newest first
exports.findAll = async () => {
  const { rows } = await db.query(
    `SELECT a.*,
            s.hostname  AS server_name,
            svc.name    AS service_name
     FROM anomalies a
     LEFT JOIN servers      s   ON a.server_id  = s.server_id
     LEFT JOIN services     svc ON a.service_id = svc.service_id
     ORDER BY a.detected_at DESC`
  );
  return rows;
};

// Get a single anomaly by ID
exports.findById = async (id) => {
  const { rows } = await db.query(
    `SELECT * FROM anomalies WHERE anomaly_id = $1`,
    [id]
  );
  return rows[0];
};

// Link an anomaly to an incident
exports.linkToIncident = async (anomalyId, incidentId) => {
  const { rows } = await db.query(
    `UPDATE anomalies SET incident_id = $1 WHERE anomaly_id = $2 RETURNING *`,
    [incidentId, anomalyId]
  );
  return rows[0];
};

// Update anomaly status (e.g. when incident is resolved)
exports.updateStatus = async (id, status, resolvedAt = null) => {
  const { rows } = await db.query(
    `UPDATE anomalies SET status = $1, resolved_at = $2 WHERE anomaly_id = $3 RETURNING *`,
    [status, resolvedAt, id]
  );
  return rows[0];
};
