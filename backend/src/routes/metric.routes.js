const express = require("express");
const router = express.Router();
const metricController = require("../controllers/metric.controller");
const cache = require("../utils/cache");

router.get("/servers", cache.middleware(10), metricController.getAggregatedServerMetrics);
router.get("/server/:id", cache.middleware(10), metricController.getServerMetrics);
router.get("/service/:id", cache.middleware(10), metricController.getServiceMetrics);
router.get("/server/:id/baselines", cache.middleware(15), metricController.getServerBaselines);
router.get("/service/:id/baselines", cache.middleware(15), metricController.getServiceBaselines);

module.exports = router;
