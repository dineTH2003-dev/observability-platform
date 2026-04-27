const app = require("./app");
const env = require("./config/env");
require("./config/db");
const logger = require("./config/logger");

app.listen(env.port || 9000, () => {
  logger.info({
    msg: `Server started`,
    port: env.port || 9000,
    env: env.nodeEnv,
  });
});