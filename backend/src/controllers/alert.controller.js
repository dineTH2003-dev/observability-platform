const Alert = require("../models/alert.model");

// GET /api/alerts
exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.getAllAlerts();
    res.json(alerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
};

// PUT /api/alerts/:event_type
exports.updateAlert = async (req, res) => {
  try {
    const { event_type } = req.params;
    const { is_enabled, recipients } = req.body;

    const updated = await Alert.updateAlert(event_type, {
      is_enabled,
      recipients,
    });

    if (!updated) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update alert" });
  }
};