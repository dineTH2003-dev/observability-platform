const express = require("express");
const router = express.Router();

const reportController = require("../controllers/report.controller");

// 📊 JSON report
router.get("/", reportController.getReport);

// 📄 PDF report
router.get("/download", reportController.downloadReportPDF);

module.exports = router;