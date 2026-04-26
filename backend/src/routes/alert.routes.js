const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alert.controller");

// GET all alerts
router.get("/", alertController.getAlerts);

// UPDATE alert
router.put("/:event_type", alertController.updateAlert);

module.exports = router;