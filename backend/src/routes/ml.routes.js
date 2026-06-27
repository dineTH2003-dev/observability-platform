const express = require("express");
const router = express.Router();
const { authenticateMlWorker } = require("../middlewares/internalMl.middleware");
const controller = require("../controllers/ml.controller");

router.get("/health", authenticateMlWorker, controller.health);
router.post("/anomalies", authenticateMlWorker, controller.createAnomaly);

module.exports = router;
