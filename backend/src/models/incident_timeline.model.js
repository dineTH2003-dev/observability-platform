const db = require('../config/db');

// Append a new event to the timeline (never update or delete rows here)
exports.addEvent = async (incidentId, actorId, eventType, message) => {
  const { rows } = await db.query(
    `INSERT INTO incident_timeline (incident_id, actor_id, event_type, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [incidentId, actorId || null, eventType, message]
  );
  return rows[0];
};

// Get all timeline events for an incident, oldest first (for display)
exports.getByIncident = async (incidentId) => {
  const { rows } = await db.query(`
    SELECT
      t.*,
      u.email AS actor_email
    FROM incident_timeline t
    LEFT JOIN users u ON t.actor_id = u.id
    WHERE t.incident_id = $1
    ORDER BY t.occurred_at ASC
  `, [incidentId]);
  return rows;
};
