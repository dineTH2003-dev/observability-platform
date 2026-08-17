const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working"
  });
});

router.use("/applications", authenticate, require("./application.routes"));
router.use("/hosts",         authenticate, require("./host.routes"));
router.use("/auth",                        require("./auth.routes"));
router.use("/tickets",       authenticate, require("./ticket.routes"));
router.use("/services",      authenticate, require("./service.routes"));
router.use("/agent",                       require("./agent.routes"));
router.use("/reports",       authenticate, authorize(['admin']), require("./report.routes"));
router.use("/notifications", authenticate, require("./notification.routes"));
router.use("/incidents",     authenticate, require("./incident.routes"));
router.use("/anomalies",     authenticate, require("./anomaly.routes"));
router.use("/ml",                          require("./ml.routes"));
router.use("/alerts",        authenticate, require("./alert.routes"));
router.use("/alert-settings",authenticate, require("./alertSettings.routes"));
router.use("/metrics",       authenticate, require("./metric.routes"));
router.use("/dashboard",     authenticate, require("./dashboard.routes"));
router.use("/profile",                     require("./profile.routes"));
router.use("/logs",          authenticate, require("./log.routes"));

module.exports = router;
