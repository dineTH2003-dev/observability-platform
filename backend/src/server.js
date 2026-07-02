const app = require("./app");
const env = require("./config/env");
const db = require("./config/db");
const logger = require("./config/logger");

const http = require("http");
const { initSocket } = require("./socket");

const server = http.createServer(app);
const port = env.port || 9000;

// Initialize Socket.io
initSocket(server);

// Ensure Notifications Table exists
const NotificationModel = require("./models/notification.model");
NotificationModel.ensureTable().catch((err) => {
  console.error("Failed to ensure notifications table:", err);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error({
      msg: `Backend failed to start: port ${port} is already in use`,
      port,
      code: err.code,
    });
    console.error(
      `Backend failed to start: port ${port} is already in use. Stop the existing process or change PORT in .env.`
    );
    process.exit(1);
  }

  logger.error({ msg: "Backend server startup error", err });
  console.error("Backend server startup error:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ msg: "Unhandled promise rejection", reason });
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  logger.error({ msg: "Uncaught exception", err });
  console.error("Uncaught exception:", err);
  process.exit(1);
});

server.listen(port, () => {
  logger.info({
    msg: `Server started`,
    port,
    env: env.nodeEnv,
  });
  console.log(`Backend server running on port ${port}`);
});
