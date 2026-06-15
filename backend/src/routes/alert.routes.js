const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alert.controller");

router.get("/", alertController.getAllAlerts);
router.post("/", alertController.createAlert);
router.patch("/:id", alertController.toggleAlert);
router.delete("/:id", alertController.deleteAlert);

module.exports = router;