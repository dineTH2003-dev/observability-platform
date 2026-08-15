const db = require("../config/db");

const getAllAlerts = async () => {
  const result = await db.query(
    `SELECT id, name, condition, severity, duration, enabled, recipients, scope, cooldown,
            send_once AS "sendOnce", threshold
     FROM alerts ORDER BY id DESC`
  );
  return result.rows;
};

const createAlert = async (alertData) => {
  const { id, name, condition, severity, duration, enabled, recipients, scope, cooldown, sendOnce, threshold } = alertData;
  const result = await db.query(
    `INSERT INTO alerts
    (id, name, condition, severity, duration, enabled, recipients, scope, cooldown, send_once, threshold)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id, name, condition, severity, duration, enabled, recipients, scope, cooldown,
              send_once AS "sendOnce", threshold`,
    [
      id,
      name,
      condition,
      severity,
      duration,
      enabled,
      JSON.stringify(recipients || []),
      scope,
      cooldown,
      sendOnce,
      threshold
    ]
  );
  return result.rows[0];
};

const toggleAlert = async (id, enabled) => {
  const result = await db.query(
    `UPDATE alerts SET enabled=$1, updated_at=NOW() WHERE id=$2
     RETURNING id, name, condition, severity, duration, enabled, recipients, scope, cooldown,
               send_once AS "sendOnce", threshold`,
    [enabled, id]
  );
  return result.rows[0];
};

const updateAlert = async (id, alertData) => {
  const { name, condition, severity, duration, enabled, recipients, scope, cooldown, sendOnce, threshold } = alertData;
  const result = await db.query(
    `UPDATE alerts
     SET name=$1, condition=$2, severity=$3, duration=$4, enabled=$5,
         recipients=$6, scope=$7, cooldown=$8, send_once=$9, threshold=$10,
         updated_at=NOW()
     WHERE id=$11
     RETURNING id, name, condition, severity, duration, enabled, recipients, scope, cooldown,
               send_once AS "sendOnce", threshold`,
    [
      name,
      condition,
      severity,
      duration,
      enabled,
      JSON.stringify(recipients || []),
      scope,
      cooldown,
      sendOnce,
      threshold,
      id
    ]
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
    `INSERT INTO alert_settings (id, alert_events, recipients, email_channel_enabled, email_address, updated_at)
     VALUES (1, $1, $2, $3, $4, NOW())
     ON CONFLICT (id) DO UPDATE
       SET alert_events        = EXCLUDED.alert_events,
           recipients          = EXCLUDED.recipients,
           email_channel_enabled = EXCLUDED.email_channel_enabled,
           email_address       = EXCLUDED.email_address,
           updated_at          = NOW()
     RETURNING alert_events, recipients, email_channel_enabled, email_address`,
    [
      JSON.stringify(alertEvents || {}),
      JSON.stringify(recipients || {}),
      emailChannelEnabled ?? false,
      emailAddress ?? null
    ]
  );
  return result.rows[0];
};

module.exports = {
  getAllAlerts,
  createAlert,
  toggleAlert,
  updateAlert,
  deleteAlert,
  getAlertSettings,
  updateAlertSettings,
};