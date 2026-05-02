const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET settings
router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM alert_settings WHERE id=1");

  const row = result.rows[0];

  res.json({
    alertEvents: row.alert_events || {},
    recipients: row.recipients || {},
    emailChannelEnabled: row.email_channel_enabled,
    emailAddress: row.email_address,
  });
});

// SAVE settings
router.post("/", async (req, res) => {
  const { alertEvents, recipients, emailChannelEnabled, emailAddress } = req.body;

  const result = await db.query(
    `UPDATE alert_settings
     SET alert_events=$1,
         recipients=$2,
         email_channel_enabled=$3,
         email_address=$4
     WHERE id=1
     RETURNING *`,
    [alertEvents, recipients, emailChannelEnabled, emailAddress]
  );

  const row = result.rows[0];

  res.json({
    alertEvents: row.alert_events,
    recipients: row.recipients,
    emailChannelEnabled: row.email_channel_enabled,
    emailAddress: row.email_address,
  });
});

module.exports = router;