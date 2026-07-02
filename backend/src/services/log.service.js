const LogModel = require("../models/log.model");

exports.getLogs = async (filters) => {
  return LogModel.findAll(filters);
};
