const asyncHandler = require("../middlewares/asyncHandler");
const ServiceService = require("../services/service.service");

exports.getAll = asyncHandler(async (req, res) => {
  const services = await ServiceService.getServices();
  res.json({ success: true, data: services });
});

exports.getById = asyncHandler(async (req, res) => {
  const svc = await ServiceService.getServiceById(req.params.id);
  res.json({ success: true, data: svc });
});

exports.updateApplication = asyncHandler(async (req, res) => {
  const { application_id } = req.body;
  if (!application_id)
    return res
      .status(400)
      .json({ success: false, message: "application_id is required" });
  const updated = await ServiceService.updateApplication(
    req.params.id,
    application_id,
  );
  res.json({ success: true, data: updated });
});

exports.remove = asyncHandler(async (req, res) => {
  await ServiceService.deleteService(req.params.id);
  res.json({ success: true, message: "Service deleted successfully" });
});

exports.getLogConfig = asyncHandler(async (req, res) => {
  const config = await ServiceService.getLogConfig(req.params.id);
  res.json({ success: true, data: config });
});

exports.saveLogConfig = asyncHandler(async (req, res) => {
  const { log_path, is_enabled } = req.body;
  const config = await ServiceService.saveLogConfig(req.params.id, {
    log_path,
    is_enabled,
  });
  res.status(201).json({ success: true, data: config });
});
