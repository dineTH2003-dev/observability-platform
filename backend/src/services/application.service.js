const ApplicationModel = require("../models/application.model");
const ApiError = require("../utils/apiError");

exports.createApplication = async (data) => {
  if (!data.name) {
    throw new ApiError(400, "Application name is required");
  }

  return await ApplicationModel.create(data);
};

exports.getApplications = async () => {
  return await ApplicationModel.findAll();
};

exports.getApplicationById = async (id) => {
  const app = await ApplicationModel.findById(id);

  if (!app) {
    throw new ApiError(404, "Application not found");
  }

  return app;
};

exports.updateApplication = async (id, data) => {
  const updated = await ApplicationModel.update(id, data);

  if (!updated) {
    throw new ApiError(404, "Application not found");
  }

  return updated;
};

exports.deleteApplication = async (id) => {
  const app = await ApplicationModel.findById(id);

  if (!app) {
    throw new ApiError(404, "Application not found");
  }

  await ApplicationModel.remove(id);
};