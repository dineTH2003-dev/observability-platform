const express = require("express");
const router = express.Router();

router.use("/applications", require("./application.routes"));
router.use("/hosts", require("./host.routes"));


module.exports = router;