const alertService = require("../services/alert.service");

// GET all rules
const getAllAlerts = async (req, res) => {
  try {
    const alerts = await alertService.getAllAlerts();
    // Safety Requirement: Maintain existing response structure exactly (res.json(data.rows))
    res.json(alerts);
  } catch (err) {
    console.error("❌ Get Alerts Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE rule
const createAlert = async (req, res) => {
  try {
    const newAlert = await alertService.createAlert(req.body);
    res.json(newAlert);
  } catch (err) {
    console.error("❌ Create Alert Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// TOGGLE or UPDATE rule
const toggleAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, ...rest } = req.body;

    // If there are other fields besides `enabled`, do a full update
    const isFullUpdate = Object.keys(rest).length > 0;
    let updatedAlert;
    if (isFullUpdate) {
      updatedAlert = await alertService.updateAlert(id, req.body);
    } else {
      updatedAlert = await alertService.toggleAlert(id, enabled);
    }

    if (!updatedAlert) {
      return res.status(404).json({ success: false, message: "Alert rule not found" });
    }
    res.json(updatedAlert);
  } catch (err) {
    console.error("❌ Update Alert Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE rule
const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    await alertService.deleteAlert(id);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("❌ Delete Alert Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET settings
const getAlertSettings = async (req, res) => {
  try {
    const row = await alertService.getAlertSettings();
    if (!row) {
      return res.json({
        alertEvents: {},
        recipients: {},
        emailChannelEnabled: false,
        emailAddress: "",
      });
    }

    res.json({
      alertEvents: row.alert_events || {},
      recipients: row.recipients || {},
      emailChannelEnabled: row.email_channel_enabled,
      emailAddress: row.email_address,
    });
  } catch (err) {
    console.error("❌ Get Alert Settings Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// SAVE settings
const updateAlertSettings = async (req, res) => {
  try {
    const row = await alertService.updateAlertSettings(req.body);

    res.json({
      alertEvents: row.alert_events,
      recipients: row.recipients,
      emailChannelEnabled: row.email_channel_enabled,
      emailAddress: row.email_address,
    });
  } catch (err) {
    console.error("❌ Update Alert Settings Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllAlerts,
  createAlert,
  toggleAlert,
  deleteAlert,
  getAlertSettings,
  updateAlertSettings,
};
