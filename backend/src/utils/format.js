const PDFDocument = require("pdfkit");

const generateReportPDF = async (data, title, from, to) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        bufferPages: true,
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });

      // ─── REPORT TYPE FLAGS ───────────────────────────────────────
      const titleUpper = title.toUpperCase();
      const isIncident     = titleUpper.includes("INCIDENT");
      const isReliability  = titleUpper.includes("RELIABILITY");
      const isPerformance  = titleUpper.includes("PERFORMANCE");
      const isInfrastructure = titleUpper.includes("INFRASTRUCTURE");

      // ─── NORMALISE DATA TO A FLAT ARRAY WHERE POSSIBLE ──────────
      // For incident reports data = { anomalies: [], incidents: [] }
      // For reliability reports data = { uptime_percentage, mttd_seconds, ... }
      // For all others data is an array of rows
      let rowData = [];
      if (Array.isArray(data)) {
        rowData = data;
      } else if (isIncident) {
        rowData = [...(data.anomalies || []), ...(data.incidents || [])];
      }
      // reliability has no row array

      const totalRecords = isReliability ? 1 : rowData.length;

      // ─── PRE-COMPUTATION (infra / performance only) ───────────────
      let avgCpu = 0, peakCpu = 0, lowCpu = 0;
      let avgMem = 0, peakMem = 0, lowMem = 0;
      let avgDisk = 0;
      let cpuSpikes = 0, memSpikes = 0;

      if (!isIncident && !isReliability && rowData.length > 0) {
        let sumCpu = 0, sumMem = 0, sumDisk = 0;
        let localLowCpu = 100, localLowMem = 100;

        rowData.forEach(row => {
          // SQL aliases the columns as "cpu", "memory", "disk"
          const cpu  = Number(row.cpu  || 0);
          const mem  = Number(row.memory || 0);
          const disk = Number(row.disk || 0);

          sumCpu += cpu; sumMem += mem; sumDisk += disk;

          if (cpu > peakCpu) peakCpu = cpu;
          if (cpu < localLowCpu) localLowCpu = cpu;
          if (mem > peakMem) peakMem = mem;
          if (mem < localLowMem) localLowMem = mem;
          if (disk > avgDisk) avgDisk = disk; // re-used as peakDisk

          if (cpu > 85) cpuSpikes++;
          if (mem > 85) memSpikes++;
        });

        avgCpu   = (sumCpu  / rowData.length).toFixed(2);
        avgMem   = (sumMem  / rowData.length).toFixed(2);
        peakCpu  = peakCpu.toFixed(2);
        lowCpu   = localLowCpu === 100 ? "0.00" : localLowCpu.toFixed(2);
        peakMem  = peakMem.toFixed(2);
        lowMem   = localLowMem === 100 ? "0.00" : localLowMem.toFixed(2);
      }

      // ─── COMPUTED SCORES ─────────────────────────────────────────
      const avgUtilization   = (Number(avgCpu) + Number(avgMem)) / 2;
      const resourceEfficiency = Math.max(0, 100 - avgUtilization).toFixed(1);
      const stabilityScore   = totalRecords > 0
        ? (((totalRecords - cpuSpikes - memSpikes) / totalRecords) * 100).toFixed(1)
        : "100.0";
      const healthScore      = ((Number(resourceEfficiency) + Number(stabilityScore)) / 2).toFixed(1);

      let healthStatus = "OPTIMAL";
      if (healthScore < 50)      healthStatus = "CRITICAL";
      else if (healthScore < 75) healthStatus = "WARNING";
      else if (healthScore < 90) healthStatus = "STABLE";

      // ─── PDF HELPERS ──────────────────────────────────────────────
      const addDivider = () => {
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#E0E0E0").lineWidth(1).stroke();
        doc.moveDown(0.5);
      };

      const writeSectionHeader = (header) => {
        if (doc.y + 80 > 750) doc.addPage();
        doc.moveDown(1);
        doc.x = 50;
        doc.fillColor("#1A1A1A").fontSize(14).font("Helvetica-Bold").text(header, { align: "left" });
        doc.moveDown(0.5);
      };

      const writeProfessionalPoint = (label, text) => {
        if (doc.y + 60 > 750) doc.addPage();
        doc.x = 50;
        doc.fillColor("#1A1A1A").fontSize(11).font("Helvetica-Bold").text(label + ":", { align: "left" });
        doc.moveUp(0.1);
        doc.fillColor("#333333").fontSize(10).font("Helvetica").text(String(text), { align: "left", indent: 15 });
        doc.moveDown(0.4);
      };

      // ─── COVER / HEADER ───────────────────────────────────────────
      doc.x = 50;
      doc.fillColor("#1A1A1A").fontSize(22).font("Helvetica-Bold").text("CLOUDSIGHT OBSERVABILITY PLATFORM", { align: "center" });
      doc.fillColor("#4A4A4A").fontSize(14).font("Helvetica").text(`${titleUpper} - OPERATIONAL INTELLIGENCE`, { align: "center" });
      addDivider();

      const headerY = doc.y;
      doc.fillColor("#666666").fontSize(10).font("Helvetica").text(`Generated: ${new Date().toLocaleString()}`, 50, headerY, { align: "left" });
      doc.text(`Date Range: ${from} to ${to}`, 50, headerY, { align: "right" });
      doc.y = headerY + 15;
      doc.text("", 50, doc.y, { align: "left" });
      addDivider();
      doc.moveDown(1);

      // ═══════════════════════════════════════════════════════════════
      // RELIABILITY REPORT — dedicated layout
      // ═══════════════════════════════════════════════════════════════
      if (isReliability) {
        const rel = data;
        const uptimePct  = Number(rel.uptime_percentage  || 100).toFixed(2);
        const mttdSec    = Number(rel.mttd_seconds        || 0);
        const mttrSec    = Number(rel.mttr_seconds         || 0);
        const downSec    = Number(rel.critical_downtime_seconds || 0);
        const totalInc   = rel.total_incidents    || 0;
        const resolvedInc = rel.resolved_incidents || 0;

        const fmtTime = (secs) => {
          if (!secs || secs === 0) return "N/A";
          const m = Math.floor(secs / 60);
          const s = Math.round(secs % 60);
          return m > 0 ? `${m}m ${s}s` : `${s}s`;
        };

        writeSectionHeader("Executive Summary");
        const uptimeNum = Number(uptimePct);
        const reliability = uptimeNum >= 99.9 ? "excellent" : uptimeNum >= 99 ? "good" : uptimeNum >= 95 ? "acceptable" : "poor";
        doc.fillColor("#333333").fontSize(10).font("Helvetica")
          .text(`The system demonstrated ${reliability} reliability during the selected period, maintaining ${uptimePct}% uptime. A total of ${totalInc} incident(s) were recorded, of which ${resolvedInc} were successfully resolved.`, { lineGap: 4 });
        doc.moveDown(0.5);

        writeSectionHeader("Reliability KPIs");
        writeProfessionalPoint("System Uptime",           `${uptimePct}%`);
        writeProfessionalPoint("Mean Time To Detect (MTTD)", fmtTime(mttdSec));
        writeProfessionalPoint("Mean Time To Resolve (MTTR)", fmtTime(mttrSec));
        writeProfessionalPoint("Critical Downtime",       fmtTime(downSec));
        writeProfessionalPoint("Total Incidents",         totalInc);
        writeProfessionalPoint("Resolved Incidents",      resolvedInc);

        writeSectionHeader("Analysis & Recommendations");
        writeProfessionalPoint("Uptime Assessment",  uptimeNum >= 99 ? "Uptime is within industry-standard SLA targets." : "Uptime is below acceptable SLA threshold. Investigate root causes.");
        writeProfessionalPoint("MTTR Assessment",    mttrSec > 0 && mttrSec < 3600 ? "Resolution times are within acceptable bounds." : mttrSec === 0 ? "No resolution time data available for this period." : "Resolution times are elevated. Consider runbook improvements.");
        writeProfessionalPoint("MTTD Assessment",    mttdSec > 0 ? "Detection pipeline is active." : "No detection time data — ensure alert acknowledgement is being tracked.");

        // footer injected below
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.moveTo(50, 760).lineTo(545, 760).strokeColor("#E5E7EB").lineWidth(1).stroke();
          doc.x = 50;
          doc.fillColor("#9CA3AF").fontSize(8).font("Helvetica");
          const fy = 770;
          doc.text("Generated by CloudSight Observability Platform", 50, fy, { align: "left" });
          doc.text("CONFIDENTIAL — ENTERPRISE MONITORING ANALYTICS", 50, fy, { align: "center" });
          doc.text(`Page ${i + 1} of ${pages.count}`, 50, fy, { align: "right" });
        }
        doc.end();
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // INCIDENT REPORT — dedicated layout
      // ═══════════════════════════════════════════════════════════════
      if (isIncident) {
        const anomalies = data.anomalies || [];
        const incidents = data.incidents || [];

        writeSectionHeader("Executive Summary");
        doc.fillColor("#333333").fontSize(10).font("Helvetica")
          .text(`During the selected period, ${anomalies.length} anomalie(s) were detected and ${incidents.length} incident(s) were recorded. This report provides a breakdown of each event.`, { lineGap: 4 });
        doc.moveDown(0.5);

        writeSectionHeader("Anomaly Summary");
        writeProfessionalPoint("Total Anomalies Detected", anomalies.length);
        if (anomalies.length > 0) {
          const bySeverity = anomalies.reduce((acc, a) => { acc[a.severity || "unknown"] = (acc[a.severity || "unknown"] || 0) + 1; return acc; }, {});
          Object.entries(bySeverity).forEach(([sev, cnt]) => {
            writeProfessionalPoint(`  ${String(sev).toUpperCase()} severity`, cnt);
          });
        }

        writeSectionHeader("Incident Summary");
        writeProfessionalPoint("Total Incidents", incidents.length);
        if (incidents.length > 0) {
          const byStatus = incidents.reduce((acc, i) => { acc[i.status || "unknown"] = (acc[i.status || "unknown"] || 0) + 1; return acc; }, {});
          Object.entries(byStatus).forEach(([st, cnt]) => {
            writeProfessionalPoint(`  ${String(st).toUpperCase()} status`, cnt);
          });
        }

        writeSectionHeader("Recommendations");
        writeProfessionalPoint("Root Cause Analysis", anomalies.length > 5 ? "High anomaly count — schedule a post-mortem review." : "Anomaly count is within normal range.");
        writeProfessionalPoint("Incident Response",   incidents.length > 3 ? "Multiple incidents detected — review on-call procedures." : "Incident volume is manageable.");

        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.moveTo(50, 760).lineTo(545, 760).strokeColor("#E5E7EB").lineWidth(1).stroke();
          doc.x = 50;
          doc.fillColor("#9CA3AF").fontSize(8).font("Helvetica");
          const fy = 770;
          doc.text("Generated by CloudSight Observability Platform", 50, fy, { align: "left" });
          doc.text("CONFIDENTIAL — ENTERPRISE MONITORING ANALYTICS", 50, fy, { align: "center" });
          doc.text(`Page ${i + 1} of ${pages.count}`, 50, fy, { align: "right" });
        }
        doc.end();
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // INFRASTRUCTURE & PERFORMANCE REPORTS — shared layout
      // ═══════════════════════════════════════════════════════════════

      // ── 1. Executive Summary ──────────────────────────────────────
      writeSectionHeader("Executive Summary");
      let execSummaryText = `During the monitoring period, the system maintained an overall health status of ${healthStatus}. `;
      if (healthStatus === "OPTIMAL" || healthStatus === "STABLE") {
        execSummaryText += `Operational stability was consistently high, with an overall stability score of ${stabilityScore}%. Infrastructure utilization remained within acceptable bounds, demonstrating solid resource efficiency at ${resourceEfficiency}%.`;
      } else {
        execSummaryText += `Operational stability faced challenges, yielding a stability score of ${stabilityScore}%. Infrastructure utilization patterns indicate periods of high stress, with resource efficiency measured at ${resourceEfficiency}%. Immediate attention is advised.`;
      }
      doc.x = 50;
      doc.fillColor("#333333").fontSize(10).font("Helvetica").text(execSummaryText, { lineGap: 4, align: "left" });
      doc.moveDown(0.5);

      // ── 2. KPI Dashboard ─────────────────────────────────────────
      writeSectionHeader("KPI Analytics");
      if (doc.y + 120 > 750) doc.addPage();

      const drawKPICard = (x, y, label, value) => {
        doc.roundedRect(x, y, 150, 50, 5).fillAndStroke("#F9FAFB", "#E5E7EB");
        doc.fillColor("#6B7280").fontSize(9).font("Helvetica-Bold").text(label, x, y + 10, { width: 150, align: "center" });
        doc.fillColor("#111827").fontSize(14).font("Helvetica-Bold").text(String(value), x, y + 25, { width: 150, align: "center" });
      };

      let kpiY = doc.y;
      drawKPICard(50,  kpiY, "Total Records",     totalRecords);
      drawKPICard(220, kpiY, "Avg CPU Usage",      `${avgCpu}%`);
      drawKPICard(390, kpiY, "Avg Memory Usage",   `${avgMem}%`);
      kpiY += 60;
      drawKPICard(50,  kpiY, "Peak CPU / Mem",     `${peakCpu}% / ${peakMem}%`);
      drawKPICard(220, kpiY, "Stability Score",    `${stabilityScore}/100`);
      drawKPICard(390, kpiY, "Health Score",       `${healthScore}/100`);
      doc.y = kpiY + 60;
      doc.x = 50;

      // ── 3. Trend Analysis ────────────────────────────────────────
      writeSectionHeader("Trend Analysis");

      let cpuTrend = "stable";
      let memTrend = "stable";
      if (rowData.length > 10) {
        const mid = Math.floor(rowData.length / 2);
        const firstHalfCpu  = rowData.slice(0, mid).reduce((s, r) => s + Number(r.cpu  || 0), 0) / mid;
        const secondHalfCpu = rowData.slice(mid).reduce((s, r) => s + Number(r.cpu  || 0), 0) / (rowData.length - mid);
        cpuTrend = secondHalfCpu > firstHalfCpu + 5 ? "increasing" : secondHalfCpu < firstHalfCpu - 5 ? "decreasing" : "stable";

        const firstHalfMem  = rowData.slice(0, mid).reduce((s, r) => s + Number(r.memory || 0), 0) / mid;
        const secondHalfMem = rowData.slice(mid).reduce((s, r) => s + Number(r.memory || 0), 0) / (rowData.length - mid);
        memTrend = secondHalfMem > firstHalfMem + 5 ? "increasing" : secondHalfMem < firstHalfMem - 5 ? "decreasing" : "stable";
      }

      writeProfessionalPoint("CPU Trend Direction",    `The utilization trend is currently ${cpuTrend} over the operational window.`);
      writeProfessionalPoint("Memory Trend Direction", `Memory allocation exhibits a ${memTrend} trajectory.`);
      writeProfessionalPoint("Spike Detection",        `Identified ${cpuSpikes} abnormal CPU spike(s) and ${memSpikes} memory spike(s).`);
      writeProfessionalPoint("Operational Consistency", `Periods of high activity were managed ${Number(stabilityScore) > 80 ? "smoothly" : "with noticeable friction"}.`);

      // ── 4. System Health Analysis ─────────────────────────────────
      writeSectionHeader("System Health Analysis");
      const hColor = healthStatus === "OPTIMAL" ? "#10B981" : healthStatus === "CRITICAL" ? "#EF4444" : "#F59E0B";
      doc.fillColor(hColor).fontSize(12).font("Helvetica-Bold").text(`Classification: ${healthStatus}`, { align: "left" });
      doc.moveDown(0.5);
      writeProfessionalPoint("CPU Pressure",            Number(avgCpu) > 70 ? "High pressure — heavy computational loads detected." : "Normal pressure, within acceptable ranges.");
      writeProfessionalPoint("Memory Pressure",         Number(avgMem) > 75 ? "Elevated memory pressure, risk of saturation." : "Optimal memory pressure, sufficient headroom.");
      writeProfessionalPoint("Infrastructure Stability", Number(stabilityScore) > 90 ? "Highly stable infrastructure behavior." : "Infrastructure exhibits variance requiring monitoring.");

      // ── 5. Conditional Section ───────────────────────────────────
      if (isPerformance) {
        writeSectionHeader("Service Analytics");
        writeProfessionalPoint("Resource Intensity",    `The monitored service maintains an average CPU footprint of ${avgCpu}%.`);
        writeProfessionalPoint("Stability Comparison",  `Service stability is rated at ${stabilityScore}%.`);
        writeProfessionalPoint("Memory Allocation",     `Peak memory draw reached ${peakMem}%.`);
        writeProfessionalPoint("APM Metrics",           "Response time and throughput data not yet collected by the current monitoring pipeline.");
      }

      // ── 6. Operational Insights ───────────────────────────────────
      writeSectionHeader("Operational Insights");
      writeProfessionalPoint("Performance Insight",  cpuTrend === "stable" ? "System performance remained stable during most operational periods." : "System performance exhibited fluctuations tracking with dynamic workloads.");
      writeProfessionalPoint("Memory Insight",       memSpikes > 0 ? `Moderate memory spikes (${memSpikes} occurrences) detected during peak utilization intervals.` : "Memory allocation remained consistent without abnormal spiking patterns.");
      writeProfessionalPoint("Saturation Insight",   avgUtilization > 80 ? "Sustained infrastructure saturation patterns observed, indicating capacity limits." : "No sustained infrastructure saturation patterns observed.");

      // ── 7. Recommendations ────────────────────────────────────────
      writeSectionHeader("Recommendations");
      writeProfessionalPoint("Memory Allocation",    memTrend === "increasing" || Number(peakMem) > 85 ? "Continue monitoring memory growth trends and investigate potential leaks." : "Memory levels are healthy; no immediate action required.");
      writeProfessionalPoint("Compute Optimization", cpuSpikes > 5 ? "Investigate recurring CPU spikes during peak windows to prevent throttling." : "Current CPU allocation strategies are effective.");
      writeProfessionalPoint("Capacity Planning",    avgUtilization < 70 ? "Current infrastructure capacity appears sufficient for observed workloads." : "Consider proactive scaling to accommodate growing resource demands.");

      // ── 8. Risk Assessment ────────────────────────────────────────
      writeSectionHeader("Risk Assessment");
      const getRisk = (val, high, med) => val > high ? "HIGH" : val > med ? "MODERATE" : "LOW";
      let infraRisk = getRisk(avgUtilization, 80, 60);
      const satRisk = getRisk(Math.max(Number(peakCpu), Number(peakMem)), 90, 75);
      const stabRisk = getRisk(100 - Number(stabilityScore), 20, 10);
      if (healthStatus === "CRITICAL") infraRisk = "CRITICAL";

      writeProfessionalPoint("Infrastructure Risk",       infraRisk);
      writeProfessionalPoint("Resource Saturation Risk",  satRisk);
      writeProfessionalPoint("Service Stability Risk",    stabRisk);
      writeProfessionalPoint("Incident Probability",      infraRisk === "HIGH" || satRisk === "HIGH" ? "ELEVATED" : "LOW");

      // ── 9. Visual Analytics (Charts) ─────────────────────────────
      writeSectionHeader("Visual Analytics");

      const drawLineChart = (chartTitle, field, color) => {
        if (doc.y + 160 > 750) doc.addPage();

        const chartStartY = doc.y;
        doc.x = 50;
        doc.fillColor("#333333").fontSize(11).font("Helvetica-Bold").text(chartTitle, { align: "left" });

        const chartX = 50, chartY = chartStartY + 20, chartW = 445, chartH = 100;

        const maxVal = rowData.length > 0 ? Math.max(...rowData.map(r => Number(r[field] || 0))) : 0;
        let yAxisMax = 100;
        if (maxVal < 10) yAxisMax = 20;
        else if (maxVal < 50) yAxisMax = 50;

        // Axes
        doc.moveTo(chartX, chartY).lineTo(chartX, chartY + chartH).strokeColor("#D1D5DB").lineWidth(1).stroke();
        doc.moveTo(chartX, chartY + chartH).lineTo(chartX + chartW, chartY + chartH).strokeColor("#D1D5DB").lineWidth(1).stroke();

        // Y-axis labels
        doc.fillColor("#9CA3AF").fontSize(8).font("Helvetica");
        doc.text(`${yAxisMax}%`, chartX - 30, chartY - 4,              { align: "left" });
        doc.text(`${yAxisMax / 2}%`, chartX - 25, chartY + chartH / 2 - 4, { align: "left" });
        doc.text("0%", chartX - 20, chartY + chartH - 4,              { align: "left" });

        if (rowData.length < 2) {
          doc.fillColor("#9CA3AF").fontSize(10).font("Helvetica").text("Insufficient data to render chart.", chartX + 10, chartY + 45, { align: "left" });
          doc.y = chartY + chartH + 30;
          return;
        }

        doc.strokeColor(color).lineWidth(2);
        const stepX = chartW / (rowData.length - 1);
        rowData.forEach((row, idx) => {
          const val = Math.min(Number(row[field] || 0), yAxisMax);
          const pxX = chartX + idx * stepX;
          const pxY = chartY + chartH - (val / yAxisMax) * chartH;
          if (idx === 0) doc.moveTo(pxX, pxY);
          else doc.lineTo(pxX, pxY);
        });
        doc.stroke();
        doc.y = chartY + chartH + 30;
      };

      // Use the SQL-aliased column names "cpu" and "memory"
      drawLineChart("CPU Utilization Trend",    "cpu",    "#3B82F6");
      drawLineChart("Memory Allocation Trend",  "memory", "#10B981");

      // ── FOOTER ───────────────────────────────────────────────────
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.moveTo(50, 760).lineTo(545, 760).strokeColor("#E5E7EB").lineWidth(1).stroke();
        doc.x = 50;
        doc.fillColor("#9CA3AF").fontSize(8).font("Helvetica");
        const fy = 770;
        doc.text("Generated by CloudSight Observability Platform", 50, fy, { align: "left" });
        doc.text("CONFIDENTIAL — ENTERPRISE MONITORING ANALYTICS",  50, fy, { align: "center" });
        doc.text(`Page ${i + 1} of ${pages.count}`,                 50, fy, { align: "right" });
      }

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateReportPDF,
};