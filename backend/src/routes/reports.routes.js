const express = require("express");
const router = express.Router();

const {
  previewReport,
  exportPDF,
} = require("../controllers/report.controller");

router.post("/preview", previewReport);
router.post("/export/pdf", exportPDF);

module.exports = router;