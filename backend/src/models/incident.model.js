const db = require('../config/db');

// Create a new incident
exports.create = async (data) => {
  const { title, description, severity } = data;

  const { rows } = await db.query(
    `INSERT INTO incidents (title, description, severity)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [title, description || null, severity || 'medium']
  );
  return rows[0];
};

// Get ALL incidents with assignee email joined — admin view
exports.findAll = async () => {
  const { rows } = await db.query(`
    SELECT
      i.*,
      u.email AS assigned_email,
      (SELECT COUNT(*) FROM anomalies a WHERE a.incident_id = i.incident_id) AS anomaly_count
    FROM incidents i
    LEFT JOIN users u ON i.assigned_to = u.id
    ORDER BY i.created_at DESC
  `);
  return rows;
};

// Get only incidents assigned to a specific engineer — engineer view
exports.findByAssignee = async (userId) => {
  const { rows } = await db.query(
    `SELECT
       i.*,
       u.email AS assigned_email,
       (SELECT COUNT(*) FROM anomalies a WHERE a.incident_id = i.incident_id) AS anomaly_count
     FROM incidents i
     LEFT JOIN users u ON i.assigned_to = u.id
     WHERE i.assigned_to = $1
     ORDER BY i.created_at DESC`,
    [userId]
  );
  return rows;
};

// Get one incident by ID with its linked anomalies included
exports.findById = async (id) => {
  const { rows } = await db.query(`
    SELECT
      i.*,
      u.email AS assigned_email
    FROM incidents i
    LEFT JOIN users u ON i.assigned_to = u.id
    WHERE i.incident_id = $1
  `, [id]);

  if (!rows[0]) return null;

  const incident = rows[0];

  // Attach linked anomalies to the incident object
  const { rows: anomalies } = await db.query(
    `SELECT * FROM anomalies WHERE incident_id = $1 ORDER BY detected_at ASC`,
    [id]
  );
  incident.anomalies = anomalies;

  return incident;
};

// Assign an engineer to an incident
exports.assignEngineer = async (id, userId) => {
  const { rows } = await db.query(
    `UPDATE incidents
     SET assigned_to = $1, updated_at = NOW()
     WHERE incident_id = $2
     RETURNING *`,
    [userId, id]
  );
  return rows[0];
};

// Update incident status — also sets acknowledged_at / resolved_at timestamps
exports.updateStatus = async (id, status, timestamps = {}) => {
  const { acknowledged_at = null, resolved_at = null } = timestamps;

  const { rows } = await db.query(
    `UPDATE incidents
     SET status          = $1,
         acknowledged_at = COALESCE($2, acknowledged_at),
         resolved_at     = COALESCE($3, resolved_at),
         updated_at      = NOW()
     WHERE incident_id = $4
     RETURNING *`,
    [status, acknowledged_at, resolved_at, id]
  );
  return rows[0];
};
