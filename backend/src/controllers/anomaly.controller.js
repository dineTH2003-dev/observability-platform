const asyncHandler = require("../middlewares/asyncHandler");
const AnomalyService = require("../services/anomaly.service");

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

  res.json({
    success: true,
    data: anomaly,
  });
});

exports.addFeedback = asyncHandler(async (req, res) => {
  const feedback = await AnomalyService.addFeedback(req.params.id, req.body, req.user);

  res.status(201).json({
    success: true,
    data: feedback,
  });
});
