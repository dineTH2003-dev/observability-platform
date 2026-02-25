const ServerModel = require("../models/host.model");
const ApiError = require("../utils/apiError");

exports.createServer = async (data) => {
  if (!data.hostname) {
    throw new ApiError(400, "Hostname is required");
  }

  if (!data.ip_address) {
    throw new ApiError(400, "IP address is required");
  }

  return await ServerModel.create(data);
};

exports.getServers = async () => {
  return await ServerModel.findAll();
};

exports.getServerById = async (id) => {
  const server = await ServerModel.findById(id);

  if (!server) {
    throw new ApiError(404, "Server not found");
  }

  return server;
};

exports.updateServer = async (id, data) => {
  const updated = await ServerModel.update(id, data);

  if (!updated) {
    throw new ApiError(404, "Server not found");
  }

  return updated;
};

exports.deleteServer = async (id) => {
  const server = await ServerModel.findById(id);

  if (!server) {
    throw new ApiError(404, "Server not found");
  }

  await ServerModel.remove(id);
};
