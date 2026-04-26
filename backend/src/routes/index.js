const express = require("express");
const router = express.Router();

router.use("/applications", require("./application.routes"));
router.use("/hosts", require("./host.routes"));
router.use("/auth", require("./auth.routes"));
router.use("/services", require("./service.routes"));
router.use("/agent", require("./agent.routes"));
router.use("/reports", require("./reports.routes"));

module.exports = router;
