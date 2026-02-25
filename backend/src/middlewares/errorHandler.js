const logger = require("../config/logger");

module.exports = function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  const payload = {
    msg: "Request error",
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorMessage: err.message,
  };

  // log full stack on server
  logger.error({ ...payload, stack: err.stack, details: err.details });

  res.status(statusCode).json({
    success: false,
    requestId: req.requestId,
    message: err.message || "Internal Server Error",
    // hide stack in production
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack, details: err.details } : {}),
  });
};