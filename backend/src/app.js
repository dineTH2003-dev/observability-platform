const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const fileUpload = require("express-fileupload");

const env = require("./config/env");
const logger = require("./config/logger");
const requestContext = require("./middlewares/requestContext");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const routes = require("./routes");

const app = express();

// core middleware
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// request id + request logger helper
app.use(requestContext);

// routes
app.get("/", (req, res) => {
  res.json({ message: "AIOps Backend Running", env: env.nodeEnv, requestId: req.requestId });
});
app.use("/api", routes);

// error handling
app.use(notFound);
app.use(errorHandler);
app.set("trust proxy", true);

module.exports = app;