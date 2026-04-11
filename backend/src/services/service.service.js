const ServiceModel = require("../models/service.model");
const LogConfigModel = require("../models/log_config.model");
const ApiError = require("../utils/apiError");

exports.getServices = async () => ServiceModel.findAll();

exports.getServiceById = async (id) => {
  const svc = await ServiceModel.findById(id);
  if (!svc) throw new ApiError(404, "Service not found");
  return svc;
};

exports.updateApplication = async (service_id, application_id) => {
  const svc = await ServiceModel.findById(service_id);
  if (!svc) throw new ApiError(404, "Service not found");
  return ServiceModel.updateApplication(service_id, application_id);
};

exports.deleteService = async (id) => {
  const svc = await ServiceModel.findById(id);
  if (!svc) throw new ApiError(404, "Service not found");
  await ServiceModel.remove(id);
};

exports.saveLogConfig = async (service_id, { log_path, is_enabled }) => {
  const svc = await ServiceModel.findById(service_id);
  if (!svc) throw new ApiError(404, "Service not found");
  if (!log_path) throw new ApiError(400, "log_path is required");
  return LogConfigModel.upsertForService(service_id, { log_path, is_enabled });
};

exports.getLogConfig = async (service_id) =>
  LogConfigModel.findByServiceId(service_id);
