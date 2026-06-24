const reportService = require("../services/report.service");
const { generateReportPDF } = require("../utils/format");

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
const downloadReportPDF = async (req, res) => {
  try {
    console.log("📥 PDF REQUEST:", req.query);

    const type = req.query.type || "GENERAL";

    const data = await reportService.getReport(req.query);

    const pdfBuffer = await generateReportPDF(
      data,
      `${type.toUpperCase()} REPORT`,
      req.query.from,
      req.query.to
    );

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

module.exports = {
  getReport,
  downloadReportPDF,
};