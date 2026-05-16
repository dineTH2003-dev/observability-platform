const alertModel = require("../models/alert.model");

const getAllAlerts = async () => {
  return await alertModel.getAllAlerts();
};

const createAlert = async (r) => {
  const alertData = {
    id: `rule-${Date.now()}`,
    name: r.name,
    condition: r.condition,
    severity: r.severity,
    duration: r.duration,
    enabled: r.enabled,
    recipients: r.recipients,
    scope: r.scope,
    cooldown: r.cooldown,
    sendOnce: r.sendOnce,
    threshold: r.threshold,
  };
  return await alertModel.createAlert(alertData);
};

const toggleAlert = async (id, enabled) => {
  return await alertModel.toggleAlert(id, enabled);
};

const deleteAlert = async (id) => {
  return await alertModel.deleteAlert(id);
};

// Settings
const getAlertSettings = async () => {
  return await alertModel.getAlertSettings();
};

const updateAlertSettings = async (settingsData) => {
  return await alertModel.updateAlertSettings(settingsData);
};

module.exports = {
  getAllAlerts,
  createAlert,
  toggleAlert,
  deleteAlert,
  getAlertSettings,
  updateAlertSettings,
};
