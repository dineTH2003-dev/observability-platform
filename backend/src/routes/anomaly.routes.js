const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const controller = require("../controllers/anomaly.controller");

router.get("/", authenticate, controller.getAll);
router.get("/:id", authenticate, controller.getById);
router.patch("/:id/status", authenticate, controller.updateStatus);
router.post("/:id/feedback", authenticate, controller.addFeedback);

module.exports = router;
