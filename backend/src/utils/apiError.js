class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode || 500;
    this.details = details;
  }
}

module.exports = ApiError;