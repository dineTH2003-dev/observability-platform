const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const { getReport, downloadReportPDF } = require("../controllers/report.controller");

router.post("/preview", authenticate, authorize(["admin"]), getReport);
router.post("/export/pdf", authenticate, authorize(["admin"]), downloadReportPDF);

module.exports = router;