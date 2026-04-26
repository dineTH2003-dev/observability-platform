const PDFDocument = require("pdfkit");
const pool = require("../config/db");
const { formatDate, formatCellValue } = require("../utils/format");

  const TABLES = {
  "system-health": "system_uptime",
  "incident-anomaly": "anomaly_incident",
  "mttr-mttd": "mttr_mttd",
  "service-health": "service_health",
};

const resolveTable = (type) => TABLES[type] || null;

exports.previewReport = async (req, res) => {
  const { reportType, scope, fromDate, toDate } = req.body;

  const table = resolveTable(reportType);
  if (!table) return res.status(400).json({ error: "Invalid type" });

  try {
    const { rows } = await pool.query(
      `SELECT * FROM ${table}
       WHERE LOWER(scope) = LOWER($1)
       AND report_date::date BETWEEN $2 AND $3`,
      [scope, fromDate, toDate]
    );

    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportPDF = async (req, res) => {
  const { reportType, scope, startDate, endDate } = req.body;

  const table = resolveTable(reportType);
  if (!table) return res.status(400).json({ error: "Invalid type" });

  try {
    const { rows } = await pool.query(
      `SELECT * FROM ${table}
       WHERE LOWER(scope) = LOWER($1)
       AND report_date::date BETWEEN $2 AND $3`,
      [scope, startDate, endDate]
    );

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(20).text("System Report", { align: "center" });

    doc.moveDown();
doc.fontSize(10).text(`Records: ${rows.length}`);
doc.moveDown();

// ===== TABLE START =====

// Dynamic headers
if (rows.length > 0) {
  const headers = Object.keys(rows[0]);

  const startX = 40;
  let y = doc.y;

  const colWidth = 80;

  // Draw headers
  headers.forEach((header, i) => {
    doc
      .fontSize(10)
      .text(header, startX + i * colWidth, y, { bold: true });
  });

  y += 20;

  // Draw rows
  rows.forEach((row) => {
    headers.forEach((header, i) => {
      let value = row[header];

      // format date nicely
      if (value instanceof Date) {
        value = formatCellValue(value);
      }

      doc.text(String(value), startX + i * colWidth, y);
    });

    y += 20;

    // Add new page if overflow
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
  });
}

// ===== TABLE END =====

    const chart = await generateChart(reportType, rows);
    if (chart) {
      doc.addPage();
      doc.image(chart, { fit: [500, 300] });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};