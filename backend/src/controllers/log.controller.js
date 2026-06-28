const asyncHandler = require("../middlewares/asyncHandler");
const LogService = require("../services/log.service");

exports.getLogs = asyncHandler(async (req, res) => {
  const { level, service, host, search, limit } = req.query;
  const logs = await LogService.getLogs({
    level,
    service,
    host,
    search,
    limit: limit ? Number(limit) : 100,
  });
  res.json({ success: true, data: logs });
});
