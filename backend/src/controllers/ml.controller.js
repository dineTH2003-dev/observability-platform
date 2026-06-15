const asyncHandler = require("../middlewares/asyncHandler");
const AnomalyService = require("../services/anomaly.service");

exports.createAnomaly = asyncHandler(async (req, res) => {
  const result = await AnomalyService.createFromMlDetection(req.body);

  res.status(result.duplicate ? 200 : 201).json({
    success: true,
    data: result,
  });
});

exports.health = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      service: "ml-ingestion",
    },
  });
});
