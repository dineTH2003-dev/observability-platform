const express = require("express");
const router = express.Router();
const metricController = require("../controllers/metric.controller");
const cacheMiddleware = require("../middlewares/cacheMiddleware");

// Cache metrics endpoints for 15 seconds
router.get("/servers", cacheMiddleware(15), metricController.getAggregatedServerMetrics);
router.get("/server/:id", cacheMiddleware(15), metricController.getServerMetrics);
router.get("/service/:id", cacheMiddleware(15), metricController.getServiceMetrics);
router.get("/server/:id/baselines", cacheMiddleware(30), metricController.getServerBaselines);
router.get("/service/:id/baselines", cacheMiddleware(30), metricController.getServiceBaselines);

module.exports = router;
