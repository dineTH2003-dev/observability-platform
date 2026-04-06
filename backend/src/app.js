const express = require("express");
const cors = require("cors");
const path = require("path");

const env = require("./config/env");
const logger = require("./config/logger");
const requestContext = require("./middlewares/requestContext");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const routes = require("./routes");
const AgentService = require("./services/agent.service");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestContext);

// Static files
// Installer downloads agent.py, discovery.py, utils.py from here
app.use("/static", express.static(path.join(__dirname, "..", "static")));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "AIOps Backend Running",
    env: env.nodeEnv,
    requestId: req.requestId,
  });
});
app.use("/api", routes);

// Error handling
app.use(notFound);
app.use(errorHandler);
app.set("trust proxy", true);

// Stale-agent sweep: every 60s, mark INACTIVE after 10 min no heartbeat
setInterval(async () => {
  try {
    const count = await AgentService.sweepStaleAgents(10);
    if (count > 0)
      logger.warn({ msg: `AgentSweep: ${count} agent(s) marked INACTIVE` });
  } catch (err) {
    logger.error({ msg: "AgentSweep error", err: err.message });
  }
}, 60_000);

module.exports = app;
