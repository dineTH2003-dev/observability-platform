const logger = require("../config/logger");

// Simple requestId without extra dependencies
function makeRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = function requestContext(req, res, next) {
  req.requestId = req.headers["x-request-id"] || makeRequestId();
  res.setHeader("x-request-id", req.requestId);

  // helper: log with requestId included
  req.log = (level, payload) => {
    logger.log(level, { requestId: req.requestId, ...payload });
  };

  next();
};