const pool = require("../config/db");

// GET all alert settings
exports.getAllAlerts = async () => {
  const { rows } = await pool.query(
    "SELECT event_type, is_enabled, recipients FROM alert_settings"
  );
  return rows;
};

// UPDATE alert setting
exports.updateAlert = async (event_type, { is_enabled, recipients }) => {
  const { rows } = await pool.query(
    `UPDATE alert_settings
     SET is_enabled = $1,
         recipients = $2,
         updated_at = NOW()
     WHERE event_type = $3
     RETURNING *`,
    [is_enabled, recipients, event_type]
  );

  return rows[0];
};