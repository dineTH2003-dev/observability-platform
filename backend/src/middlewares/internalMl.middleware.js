const env = require("../config/env");

function authenticateMlWorker(req, res, next) {
  if (!env.ml.internalToken) {
    if (env.nodeEnv === "production") {
      return res.status(503).json({
        success: false,
        message: "ML_INTERNAL_TOKEN is required in production",
      });
    }
    return next();
  }

  const token = req.headers["x-ml-token"];
  if (token !== env.ml.internalToken) {
    return res.status(401).json({
      success: false,
      message: "Invalid ML worker token",
    });
  }

  return next();
}

module.exports = {
  authenticateMlWorker,
};
