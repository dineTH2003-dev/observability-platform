const reportModel = require("../models/report.model");

const REPORT_TYPES = {
  SERVER: "server",
  SERVICE: "service",
  ERROR: "error",
};

const getReport = async ({ type, from, to, scopeId }) => {
  if (!type || !from || !to) {
    throw new Error("type, from, and to are required");
  }

  if (new Date(from) > new Date(to)) {
    throw new Error("Invalid date range");
  }

  const start = `${from} 00:00:00`;
  const end = `${to} 23:59:59`;

  // 🖥 SERVER REPORT
  if (type === REPORT_TYPES.SERVER) {
    if (!scopeId) throw new Error("serverId (scopeId) required");

    const result = await reportModel.getServerMetrics(scopeId, start, end);
    return result.rows;
  }

  // ⚙ SERVICE REPORT
  if (type === REPORT_TYPES.SERVICE) {
    const result = scopeId
      ? await reportModel.getServiceMetrics(scopeId, start, end)
      : await reportModel.getAllServiceMetrics(start, end);

    return result.rows;
  }

  // 📉 ERROR REPORT
  if (type === REPORT_TYPES.ERROR) {
    const result = await reportModel.getAllServiceMetrics(start, end);

    return result.rows.filter((r) => r.error_rate > 0.5);
  }

  throw new Error("Invalid report type");
};

module.exports = { getReport };