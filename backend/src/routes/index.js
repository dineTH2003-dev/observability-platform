const express = require("express");
const router = express.Router();

router.use("/applications", require("./application.routes"));
router.use("/hosts", require("./host.routes"));
router.use("/auth", require("./auth.routes"));

module.exports = router;