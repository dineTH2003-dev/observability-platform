const asyncHandler = require("../middlewares/asyncHandler");
const MetricModel = require("../models/metric.model");

// GET /api/metrics/servers
exports.getAggregatedServerMetrics = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 20;
  const data = await MetricModel.getAggregatedServerMetrics(limit);
  res.json({ success: true, data });
});

// GET /api/metrics/server/:id
exports.getServerMetrics = asyncHandler(async (req, res) => {
  const serverId = req.params.id;
  const limit = req.query.limit ? parseInt(req.query.limit) : 60;
  const data = await MetricModel.getServerMetrics(serverId, limit);
  res.json({ success: true, data });
});

// GET /api/metrics/service/:id
exports.getServiceMetrics = asyncHandler(async (req, res) => {
  const serviceId = req.params.id;
  const limit = req.query.limit ? parseInt(req.query.limit) : 60;
  const timeRange = req.query.timeRange || '1h';
  const data = await MetricModel.getServiceMetrics(serviceId, timeRange, limit);

  res.json({ success: true, data });
});
