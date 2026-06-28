const express = require("express");
const router = express.Router();
const metricController = require("../controllers/metric.controller");

router.get("/servers", metricController.getAggregatedServerMetrics);
router.get("/server/:id", metricController.getServerMetrics);
router.get("/service/:id", metricController.getServiceMetrics);
router.get("/server/:id/baselines", metricController.getServerBaselines);
router.get("/service/:id/baselines", metricController.getServiceBaselines);

module.exports = router;
