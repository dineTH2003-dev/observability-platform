const app = require("./app");
const env = require("./config/env");
require("./config/db");
const logger = require("./config/logger");

const http = require("http");
const { initSocket } = require("./socket");

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(env.port || 9000, () => {
  logger.info({
    msg: `Server started`,
    port: env.port || 9000,
    env: env.nodeEnv,
  });
});