const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alert.controller");

router.get("/", alertController.getAlertSettings);
router.post("/", alertController.updateAlertSettings);

module.exports = router;