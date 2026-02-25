const winston = require("winston");
const path = require("path");

const LOG_DIR = path.join(process.cwd(), "logs");

const addRequestId = winston.format((info) => {
  // requestId may be attached later via middleware context
  if (info.requestId) return info;
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    addRequestId(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || "aio-backend",
  },
  transports: [
    new winston.transports.Console(),

    new winston.transports.File({
      filename: path.join(LOG_DIR, "app.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),

    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(LOG_DIR, "exceptions.log") }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(LOG_DIR, "rejections.log") }),
  ],
});

module.exports = logger;