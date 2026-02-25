const app = require("./app");
const env = require("./config/env");
require("./config/db");
const logger = require("./config/logger");

app.listen(env.port, () => {
  logger.info({ msg: `Server started`, port: env.port, env: env.nodeEnv });
});