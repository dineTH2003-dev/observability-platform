const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { getReport, downloadReportPDF } = require("../controllers/report.controller");

// JSON report (admin only)
router.get("/",            authenticate, authorize(["admin"]), getReport);

// PDF report download (admin only)
router.get("/download",    authenticate, authorize(["admin"]), downloadReportPDF);

// Preview report body (admin only)
router.post("/preview",    authenticate, authorize(["admin"]), getReport);

// Export to PDF (admin only)
router.post("/export/pdf", authenticate, authorize(["admin"]), downloadReportPDF);

module.exports = router;