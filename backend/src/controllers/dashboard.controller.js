const asyncHandler = require("../middlewares/asyncHandler");
const DashboardModel = require("../models/dashboard.model");

exports.getDashboardSummary = asyncHandler(async (req, res) => {
  const data = await DashboardModel.getDashboardSummary();
  res.json({ success: true, data });
});
