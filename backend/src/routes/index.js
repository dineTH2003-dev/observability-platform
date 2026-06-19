const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use("/applications", authenticate, require("./application.routes"));
router.use("/hosts", authenticate, require("./host.routes"));
router.use("/auth", require("./auth.routes"));
router.use("/tickets", authenticate, require("./ticket.routes"));
router.use("/services", authenticate, require("./service.routes"));
router.use("/agent", authenticate, require("./agent.routes"));
router.use("/reports", authenticate, authorize(['admin']), require("./reports.routes"));
router.use("/incidents", authenticate, require("./incident.routes"));

module.exports = router;
