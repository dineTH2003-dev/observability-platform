const asyncHandler = require("../middlewares/asyncHandler");
const AnomalyService = require("../services/anomaly.service");
const { broadcastAnomalyEvent } = require("../socket");

exports.getAll = asyncHandler(async (req, res) => {
  const anomalies = await AnomalyService.getAnomalies({
    status: req.query.status,
    severity: req.query.severity,
    limit: req.query.limit,
  }, req.user);

  res.json({
    success: true,
    data: anomalies,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const anomaly = await AnomalyService.getAnomalyById(req.params.id, req.user);

  res.json({
    success: true,
    data: anomaly,
  });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const anomaly = await AnomalyService.updateStatus(req.params.id, req.body.status, req.user);

  // Real-time broadcast — status transition
  try {
    broadcastAnomalyEvent('anomaly_updated', {
      anomaly_id: anomaly.anomaly_id,
      status: anomaly.status,
      resolved_at: anomaly.resolved_at || null,
      action: 'status_changed',
    });
  } catch (err) {
    console.error("Socket broadcast failed (anomaly_updated):", err.message);
  }

  res.json({
    success: true,
    data: anomaly,
  });
});

exports.addFeedback = asyncHandler(async (req, res) => {
  const feedback = await AnomalyService.addFeedback(req.params.id, req.body, req.user);

  // Real-time broadcast — feedback added
  try {
    broadcastAnomalyEvent('anomaly_updated', {
      anomaly_id: req.params.id,
      action: 'feedback_added',
      feedback,
    });
  } catch (err) {
    console.error("Socket broadcast failed (anomaly_updated):", err.message);
  }

  res.status(201).json({
    success: true,
    data: feedback,
  });
});
