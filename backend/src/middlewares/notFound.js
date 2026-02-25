const ApiError = require("../utils/apiError");

module.exports = function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};