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

const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const app = express();

// Trust proxy for rate limiting behind load balancers/reverse proxies
app.set("trust proxy", 1);

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline scripts/styles for dashboard rendering
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Cookie Parser for HttpOnly JWT session tokens
app.use(cookieParser());

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed for this origin"));
      }
    },
    credentials: true,
  })
);

// Global Rate Limiter: 1000 requests per 15 mins
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { message: "Too many requests from this IP, please try again later." },
});
app.use(globalLimiter);

// Middleware
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

