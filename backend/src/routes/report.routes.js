const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
  getReport,
  downloadReportPDF,
  getExportHistory,
  downloadHistoricalReport,
} = require("../controllers/report.controller");

// ── Existing endpoints — unchanged ────────────────────────────────────────────

// JSON report (admin only)
router.get("/",            authenticate, authorize(["admin"]), getReport);

// PDF report download (admin only)
router.get("/download",    authenticate, authorize(["admin"]), downloadReportPDF);

// Preview report body (admin only)
router.post("/preview",    authenticate, authorize(["admin"]), getReport);

// Export to PDF (admin only)
router.post("/export/pdf", authenticate, authorize(["admin"]), downloadReportPDF);

// ── New history endpoints ─────────────────────────────────────────────────────

// List all export history records (admin only)
router.get("/history",              authenticate, authorize(["admin"]), getExportHistory);

// Download a specific historical PDF by record ID (admin only)
router.get("/history/:id/download", authenticate, authorize(["admin"]), downloadHistoricalReport);

module.exports = router;
