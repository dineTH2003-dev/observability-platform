const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/agent.controller");

router.post("/heartbeat", controller.heartbeat);
router.post("/metrics",   controller.ingestMetrics);
router.post("/services",  controller.ingestServices);

module.exports = router;
