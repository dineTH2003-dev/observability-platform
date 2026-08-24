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

// ─── CORS Configuration ───────────────────────────────────────────────────────
// Allowed origins: Amplify frontend URL (production) + localhost (development).
// No-origin requests (e.g. Python mock agents, curl) are always allowed through.
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,       // e.g. https://main.xxxxx.amplifyapp.com
  process.env.BACKEND_URL,        // EC2 API itself (needed for same-origin requests)
  "http://localhost:5173",        // Vite dev server
  "http://localhost:3000",        // CRA / alternate dev port
  "http://127.0.0.1:5173",
].filter(Boolean); // remove undefined entries if env vars aren't set

app.use(
  cors({
    origin: (incomingOrigin, callback) => {
      // Allow requests with no origin (native agents, curl, server-to-server)
      if (!incomingOrigin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(incomingOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin '${incomingOrigin}' not allowed`));
    },
    credentials: true,            // Required for Authorization header + cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  })
);
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

// Alert Rule Evaluator: every 60s, evaluate custom alert rules
const AlertEvaluatorService = require("./services/alert-evaluator.service");
setInterval(async () => {
  try {
    await AlertEvaluatorService.evaluateAlertRules();
  } catch (err) {
    logger.error({ msg: "AlertEvaluator loop error", err: err.message });
  }
}, 60_000);

module.exports = app;

