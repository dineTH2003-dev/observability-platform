const db = require("../config/db");

const getAllAlerts = async () => {
  const result = await db.query(
    "SELECT id, name, condition, severity, duration, enabled, recipients, scope, cooldown, send_once, threshold FROM alerts ORDER BY id DESC"
  );
  return result.rows;
};

const createAlert = async (alertData) => {
  const { id, name, condition, severity, duration, enabled, recipients, scope, cooldown, sendOnce, threshold } = alertData;
  const result = await db.query(
    `INSERT INTO alerts
    (id, name, condition, severity, duration, enabled, recipients, scope, cooldown, send_once, threshold)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id, name, condition, severity, duration, enabled, recipients, scope, cooldown, send_once, threshold`,
    [id, name, condition, severity, duration, enabled, recipients, scope, cooldown, sendOnce, threshold]
  );
  return result.rows[0];
};

const toggleAlert = async (id, enabled) => {
  const result = await db.query(
    "UPDATE alerts SET enabled=$1 WHERE id=$2 RETURNING id, name, condition, severity, duration, enabled, recipients, scope, cooldown, send_once, threshold",
    [enabled, id]
  );
  return result.rows[0];
};

const deleteAlert = async (id) => {
  await db.query("DELETE FROM alerts WHERE id=$1", [id]);
  return true;
};

const getAlertSettings = async () => {
  const result = await db.query(
    "SELECT alert_events, recipients, email_channel_enabled, email_address FROM alert_settings WHERE id=1"
  );
  return result.rows[0];
};

const updateAlertSettings = async (settingsData) => {
  const { alertEvents, recipients, emailChannelEnabled, emailAddress } = settingsData;
  const result = await db.query(
    `UPDATE alert_settings
     SET alert_events=$1,
         recipients=$2,
         email_channel_enabled=$3,
         email_address=$4
     WHERE id=1
     RETURNING alert_events, recipients, email_channel_enabled, email_address`,
    [alertEvents, recipients, emailChannelEnabled, emailAddress]
  );
  return result.rows[0];
};

module.exports = {
  getAllAlerts,
  createAlert,
  toggleAlert,
  deleteAlert,
  getAlertSettings,
  updateAlertSettings,
};