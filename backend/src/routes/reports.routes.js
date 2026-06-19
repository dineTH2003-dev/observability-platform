const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const {
  previewReport,
  exportPDF,
} = require("../controllers/report.controller");

router.post("/preview", authenticate, authorize(['admin']), previewReport);
router.post("/export/pdf", authenticate, authorize(['admin']), exportPDF);

module.exports = router;