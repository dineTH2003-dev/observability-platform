const path = require("path");
const fs = require("fs");
const reportService = require("../services/report.service");
const { generateReportPDF } = require("../utils/format");
const reportExportModel = require("../models/report_export.model");
const logger = require("../config/logger");

// Directory where PDF copies are stored for history re-downloads
// Resolves to: backend/uploads/reports/
const REPORTS_UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "reports");

// Create the directory once at module load (sync, harmless if already exists)
if (!fs.existsSync(REPORTS_UPLOAD_DIR)) {
  fs.mkdirSync(REPORTS_UPLOAD_DIR, { recursive: true });
}

/**
 * Derive the scope label matching CloudSight's existing UI terminology.
 *   infrastructure + scopeId → "Server"   (UI shows "Select server")
 *   performance    + scopeId → "Service"  (UI shows services list)
 *   anything else / no scopeId → "Global"
 */
function deriveScope(type, scopeId) {
  if (!scopeId) return "Global";
  if (type === "infrastructure") return "Server";
  if (type === "performance") return "Service";
  return "Global";
}

/**
 * Build a safe, unique PDF filename.
 * Format: <type>-<from>-to-<to>-<YYYYMMDDHHmmss>.pdf
 */
function buildFileName(type, from, to) {
  const safeType = String(type).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const safeFrom = String(from || "").replace(/[^0-9-]/g, "");
  const safeTo   = String(to   || "").replace(/[^0-9-]/g, "");
  const ts = new Date()
    .toISOString()
    .replace("T", "-")
    .replace(/:/g, "")
    .slice(0, 15);
  return `${safeType}-${safeFrom}-to-${safeTo}-${ts}.pdf`;
}

// 📊 JSON report
const getReport = async (req, res) => {
  try {
    console.log("📥 REPORT REQUEST:", req.query);

    const data = await reportService.getReport(req.query);

    return res.json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      data,
    });
  } catch (err) {
    console.error("❌ Report Error:", err.message);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// 📄 PDF report
// Core behaviour UNCHANGED: generates PDF, streams it to client.
// Additionally saves a copy to disk and inserts a history record.
// If either history step throws, the PDF is STILL returned — non-critical.
const downloadReportPDF = async (req, res) => {
  try {
    console.log("📥 PDF REQUEST:", req.query);

    const { type = "GENERAL", from, to, scopeId } = req.query;

    // 1. Fetch report data — unchanged
    const data = await reportService.getReport(req.query);

    // 2. Generate PDF buffer — unchanged
    const pdfBuffer = await generateReportPDF(
      data,
      `${type.toUpperCase()} REPORT`,
      from,
      to
    );

    // 3. History side-effect — non-critical, wrapped in its own try/catch
    try {
      const fileName = buildFileName(type, from, to);
      const filePath = path.join(REPORTS_UPLOAD_DIR, fileName);

      fs.writeFileSync(filePath, pdfBuffer);

      // req.user.userId confirmed from auth.middleware.js:
      //   req.user = { userId: user.id, email: user.email, role: user.role }
      await reportExportModel.createExportRecord({
        reportType : type,
        scope      : deriveScope(type, scopeId),
        scopeId    : scopeId || null,
        timeRange  : `${from} to ${to}`,
        fileName,
        filePath,
        exportedBy : req.user.userId,
      });
    } catch (historyErr) {
      // Never block the export response for a history failure
      logger.error({ msg: "Report history save failed (non-critical)", err: historyErr.message });
    }

    // 4. Return PDF to client — same headers and mechanism as original
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ PDF Error:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ─── GET /reports/history ─────────────────────────────────────────────────────
const getExportHistory = async (req, res) => {
  try {
    const records = await reportExportModel.getAllExports();

    return res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (err) {
    logger.error({ msg: "Failed to fetch export history", err: err.message });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch export history",
    });
  }
};

// ─── GET /reports/history/:id/download ───────────────────────────────────────
const downloadHistoricalReport = async (req, res) => {
  try {
    const { id } = req.params;

    // Reject non-integer IDs before touching the DB
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0 || String(numericId) !== id) {
      return res.status(400).json({ success: false, message: "Invalid report ID" });
    }

    // Retrieve record from DB — file path always comes from DB, never from client
    const record = await reportExportModel.getExportById(numericId);
    if (!record) {
      return res.status(404).json({ success: false, message: "Export record not found" });
    }

    // Path-traversal guard: stored path must resolve inside REPORTS_UPLOAD_DIR
    const resolvedPath = path.resolve(record.file_path);
    const resolvedBase = path.resolve(REPORTS_UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
      logger.error({ msg: "Path traversal blocked on history download", id: numericId });
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Verify the file still exists on disk
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        message: "The exported PDF no longer exists on the server",
      });
    }

    const safeFileName = path.basename(resolvedPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${safeFileName}`);

    return res.sendFile(resolvedPath);
  } catch (err) {
    logger.error({ msg: "Failed to download historical report", err: err.message });
    return res.status(500).json({
      success: false,
      message: "Failed to download report",
    });
  }
};

module.exports = {
  getReport,
  downloadReportPDF,
  getExportHistory,
  downloadHistoricalReport,
};