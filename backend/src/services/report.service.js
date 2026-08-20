const reportModel = require("../models/report.model");

const REPORT_TYPES = {
  INFRASTRUCTURE: "infrastructure",
  PERFORMANCE: "performance",
  INCIDENT: "incident",
  RELIABILITY: "reliability",
};

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const getReport = async ({ type, from, to, scopeId }) => {
  if (!type || !from || !to) {
    throw new Error("type, from, and to are required");
  }

  const today = getTodayString();

  if (from > today || to > today) {
    throw new Error("Invalid date range: Future dates are not allowed");
  }

  if (from > to) {
    throw new Error("Invalid date range: From Date cannot be later than To Date");
  }

  const start = `${from} 00:00:00`;
  const end = `${to} 23:59:59`;

  if (type === REPORT_TYPES.INFRASTRUCTURE) {
    const result = await reportModel.getInfrastructureHealthReport(scopeId, start, end);
    return result.rows;
  }

  if (type === REPORT_TYPES.PERFORMANCE) {
    const result = await reportModel.getServicePerformanceReport(scopeId, start, end);
    return result.rows;
  }

  if (type === REPORT_TYPES.INCIDENT) {
    const data = await reportModel.getIncidentAnomalyReport(start, end);
    return data; // Returns an object with { anomalies, incidents }
  }

  if (type === REPORT_TYPES.RELIABILITY) {
    const result = await reportModel.getSystemReliabilityReport(start, end);
    const stats = result.rows[0];
    
    // Calculate Uptime Percentage
    let uptimePercent = 100;
    if (stats.total_period_seconds > 0) {
      const downtime = stats.critical_downtime_seconds || 0;
      uptimePercent = ((stats.total_period_seconds - downtime) / stats.total_period_seconds) * 100;
    }
    
    return {
      ...stats,
      uptime_percentage: Math.max(0, uptimePercent).toFixed(4) // Avoid negative uptime
    };
  }

  throw new Error("Invalid report type");
};

module.exports = { getReport };