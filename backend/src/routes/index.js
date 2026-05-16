const express = require("express");
const router = express.Router();

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working"
  });
});


router.use("/applications", require("./application.routes"));
router.use("/hosts", require("./host.routes"));
router.use("/auth", require("./auth.routes"));
router.use("/tickets", require("./ticket.routes"));
router.use("/services", require("./service.routes"));
router.use("/agent", require("./agent.routes"));

router.use("/reports", require("./report.routes"));

router.use("/incidents", require("./incident.routes"));
router.use("/alerts", require("./alert.routes"));
router.use("/alert-settings", require("./alertSettings.routes"));

module.exports = router;