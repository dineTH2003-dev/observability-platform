const asyncHandler = require("../middlewares/asyncHandler");
const ApplicationService = require("../services/application.service");

exports.create = asyncHandler(async (req, res) => {
  req.log("info", { msg: "Creating application" });

  const app = await ApplicationService.createApplication(req.body);

  res.status(201).json({
    success: true,
    data: app,
  });
});

exports.getAll = asyncHandler(async (req, res) => {
  const apps = await ApplicationService.getApplications();

  res.json({
    success: true,
    data: apps,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const app = await ApplicationService.getApplicationById(req.params.id);

  res.json({
    success: true,
    data: app,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const updated = await ApplicationService.updateApplication(
    req.params.id,
    req.body
  );

  res.json({
    success: true,
    data: updated,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await ApplicationService.deleteApplication(req.params.id);

  res.json({
    success: true,
    message: "Application deleted successfully",
  });
});