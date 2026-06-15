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

      // 1. DATA PRE-COMPUTATION
      let avgCpu = 0, peakCpu = 0, lowCpu = 100;
      let avgMem = 0, peakMem = 0, lowMem = 100;
      let avgDisk = 0, peakDisk = 0;
      let errorCount = 0;
      let totalRecords = data.length;
      let cpuSpikes = 0, memSpikes = 0;
      
      let isError = title.toUpperCase().includes("ERROR");
      let isService = title.toUpperCase().includes("SERVICE");

      if (totalRecords > 0) {
        let sumCpu = 0, sumMem = 0, sumDisk = 0;
        data.forEach(row => {
          const cpu = Number(row.cpu_usage || 0);
          const mem = Number(row.memory_usage || 0);
          const disk = Number(row.disk_usage || 0);
          
          sumCpu += cpu; sumMem += mem; sumDisk += disk;
          
          if (cpu > peakCpu) peakCpu = cpu;
          if (cpu < lowCpu) lowCpu = cpu;
          if (mem > peakMem) peakMem = mem;
          if (mem < lowMem) lowMem = mem;
          if (disk > peakDisk) peakDisk = disk;
          
          if (cpu > 85) cpuSpikes++;
          if (mem > 85) memSpikes++;
          
          if (row.error_rate && Number(row.error_rate) > 0) errorCount++;
        });

        avgCpu = (sumCpu / totalRecords).toFixed(2);
        avgMem = (sumMem / totalRecords).toFixed(2);
        avgDisk = (sumDisk / totalRecords).toFixed(2);
        
        peakCpu = peakCpu.toFixed(2);
        lowCpu = lowCpu === 100 && totalRecords > 0 ? "0.00" : lowCpu.toFixed(2);
        peakMem = peakMem.toFixed(2);
        lowMem = lowMem === 100 && totalRecords > 0 ? "0.00" : lowMem.toFixed(2);
      } else {
        lowCpu = 0; lowMem = 0;
      }

      // Calculated Scores
      const avgUtilization = (Number(avgCpu) + Number(avgMem)) / 2;
      const resourceEfficiency = Math.max(0, 100 - avgUtilization).toFixed(1);
      const stabilityScore = totalRecords > 0 ? (((totalRecords - cpuSpikes - memSpikes) / totalRecords) * 100).toFixed(1) : "100.0";
      const healthScore = ((Number(resourceEfficiency) + Number(stabilityScore)) / 2).toFixed(1);

      // Status
      let healthStatus = "OPTIMAL";
      if (healthScore < 50) healthStatus = "CRITICAL";
      else if (healthScore < 75) healthStatus = "WARNING";
      else if (healthScore < 90) healthStatus = "STABLE";

      // Helpers
      const addDivider = () => {
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#E0E0E0").lineWidth(1).stroke();
        doc.moveDown(0.5);
      };

      // ---------------------------------------------------------
      // COVER / HEADER SECTION
      // ---------------------------------------------------------
      // Reset doc.x explicitly to be safe
      doc.x = 50;
      
      doc.fillColor("#1A1A1A").fontSize(22).font("Helvetica-Bold").text("NEBULA OBSERVABILITY PLATFORM", { align: "center" });
      doc.fillColor("#4A4A4A").fontSize(14).font("Helvetica").text(`${title.toUpperCase()} - OPERATIONAL INTELLIGENCE`, { align: "center" });
      
      addDivider();

      let headerY = doc.y;
      doc.fillColor("#666666").fontSize(10).font("Helvetica").text(`Generated: ${new Date().toLocaleString()}`, 50, headerY, { align: "left" });
      doc.text(`Date Range: ${from} to ${to}`, 50, headerY, { align: "right" });
      
      doc.y = headerY + 15; // move down past the dual text line
      // reset left alignment for future writes
      doc.text("", 50, doc.y, { align: "left" });
      
      addDivider();
      doc.moveDown(1);

      const writeProfessionalPoint = (label, text) => {
         if (doc.y + 60 > 750) doc.addPage();
         // Use strict independent text blocks to prevent PDFKit continued:true alignment bugs
         doc.x = 50;
         doc.fillColor("#1A1A1A").fontSize(11).font("Helvetica-Bold").text(label + ":", { align: "left" });
         doc.moveUp(0.1);
         doc.fillColor("#333333").fontSize(10).font("Helvetica").text(text, { align: "left", indent: 15 });
         doc.moveDown(0.4);
      };

      const writeSectionHeader = (header) => {
         if (doc.y + 80 > 750) doc.addPage();
         doc.moveDown(1);
         doc.x = 50;
         doc.fillColor("#1A1A1A").fontSize(14).font("Helvetica-Bold").text(header, { align: "left" });
         doc.moveDown(0.5);
      };

      // ---------------------------------------------------------
      // 1. EXECUTIVE SUMMARY
      // ---------------------------------------------------------
      writeSectionHeader("Executive Summary");
      
      let execSummaryText = `During the monitoring period, the system maintained an overall health status of ${healthStatus}. `;
      if (healthStatus === "OPTIMAL" || healthStatus === "STABLE") {
         execSummaryText += `Operational stability was consistently high, with an overall stability score of ${stabilityScore}%. Infrastructure utilization remained within acceptable bounds, demonstrating solid resource efficiency at ${resourceEfficiency}%. Performance conditions indicate a robust environment capable of handling current workloads without significant degradation.`;
      } else {
         execSummaryText += `Operational stability faced challenges, yielding a stability score of ${stabilityScore}%. Infrastructure utilization patterns indicate periods of high stress, with resource efficiency measured at ${resourceEfficiency}%. Immediate attention is advised to optimize performance conditions and mitigate degradation.`;
      }
      doc.x = 50;
      doc.fillColor("#333333").fontSize(10).font("Helvetica").text(execSummaryText, { lineGap: 4, align: "left" });
      doc.moveDown(0.5);

      // ---------------------------------------------------------
      // 2. KPI ANALYTICS DASHBOARD
      // ---------------------------------------------------------
      writeSectionHeader("KPI Analytics");

      if (doc.y + 120 > 750) doc.addPage();

      const drawKPICard = (x, y, label, value) => {
        doc.roundedRect(x, y, 150, 50, 5).fillAndStroke("#F9FAFB", "#E5E7EB");
        doc.fillColor("#6B7280").fontSize(9).font("Helvetica-Bold").text(label, x, y + 10, { width: 150, align: "center" });
        doc.fillColor("#111827").fontSize(14).font("Helvetica-Bold").text(value, x, y + 25, { width: 150, align: "center" });
      };

      let kpiY = doc.y;
      drawKPICard(50, kpiY, "Total Records", totalRecords);
      drawKPICard(220, kpiY, "Avg CPU Usage", `${avgCpu}%`);
      drawKPICard(390, kpiY, "Avg Memory Usage", `${avgMem}%`);
      
      kpiY += 60;
      drawKPICard(50, kpiY, "Peak CPU / Mem", `${peakCpu}% / ${peakMem}%`);
      drawKPICard(220, kpiY, "Stability Score", `${stabilityScore}/100`);
      drawKPICard(390, kpiY, "Health Score", `${healthScore}/100`);

      doc.y = kpiY + 60;
      doc.x = 50;

      // ---------------------------------------------------------
      // 3. TREND ANALYSIS
      // ---------------------------------------------------------
      writeSectionHeader("Trend Analysis");

      // Simple half vs half comparison
      let cpuTrend = "stable";
      let memTrend = "stable";
      if (data.length > 10) {
         const mid = Math.floor(data.length / 2);
         const firstHalfCpu = data.slice(0, mid).reduce((sum, r) => sum + Number(r.cpu_usage||0), 0) / mid;
         const secondHalfCpu = data.slice(mid).reduce((sum, r) => sum + Number(r.cpu_usage||0), 0) / (data.length - mid);
         cpuTrend = secondHalfCpu > firstHalfCpu + 5 ? "increasing" : secondHalfCpu < firstHalfCpu - 5 ? "decreasing" : "stable";
         
         const firstHalfMem = data.slice(0, mid).reduce((sum, r) => sum + Number(r.memory_usage||0), 0) / mid;
         const secondHalfMem = data.slice(mid).reduce((sum, r) => sum + Number(r.memory_usage||0), 0) / (data.length - mid);
         memTrend = secondHalfMem > firstHalfMem + 5 ? "increasing" : secondHalfMem < firstHalfMem - 5 ? "decreasing" : "stable";
      }

      writeProfessionalPoint("CPU Trend Direction", `The utilization trend is currently observed to be ${cpuTrend} over the operational window.`);
      writeProfessionalPoint("Memory Trend Direction", `Memory allocation exhibits a ${memTrend} trajectory.`);
      writeProfessionalPoint("Spike Detection", `Identified ${cpuSpikes} abnormal CPU spikes and ${memSpikes} memory spikes.`);
      writeProfessionalPoint("Operational Consistency", `Periods of high activity were managed ${stabilityScore > 80 ? 'smoothly' : 'with noticeable friction'}.`);

      // ---------------------------------------------------------
      // 4. SYSTEM HEALTH ANALYSIS
      // ---------------------------------------------------------
      writeSectionHeader("System Health Analysis");

      doc.fillColor(healthStatus === "OPTIMAL" ? "#10B981" : healthStatus === "CRITICAL" ? "#EF4444" : "#F59E0B")
         .fontSize(12).font("Helvetica-Bold").text(`Classification: ${healthStatus}`, { align: "left" });
      doc.moveDown(0.5);

      writeProfessionalPoint("CPU Pressure", avgCpu > 70 ? 'High pressure observed, indicating heavy computational loads.' : 'Normal pressure, within acceptable operational ranges.');
      writeProfessionalPoint("Memory Pressure", avgMem > 75 ? 'Elevated memory pressure, risk of saturation.' : 'Optimal memory pressure, sufficient headroom available.');
      writeProfessionalPoint("Infrastructure Stability", Number(stabilityScore) > 90 ? 'Highly stable infrastructure behavior.' : 'Infrastructure exhibits variance requiring monitoring.');

      // ---------------------------------------------------------
      // 5. & 6. CONDITIONAL ANALYTICS (SERVICE / ERROR)
      // ---------------------------------------------------------
      if (isError) {
         writeSectionHeader("Error Analytics");
         writeProfessionalPoint("Total Error Occurrences", `${errorCount} flagged incidents.`);
         writeProfessionalPoint("Frequency Trend", `Errors occurred predominantly during peak utilization periods.`);
         writeProfessionalPoint("Risk Analysis", errorCount > 10 ? 'High likelihood of systemic issue escalation.' : 'Isolated incidents, low escalation risk.');
      } else if (isService) {
         writeSectionHeader("Service Analytics");
         writeProfessionalPoint("Resource Intensity", `The monitored service maintains an average CPU footprint of ${avgCpu}%.`);
         writeProfessionalPoint("Stability Comparison", `Service stability is rated at ${stabilityScore}%.`);
         writeProfessionalPoint("Memory Allocation", `Peak memory draw for the service reached ${peakMem}%.`);
      }

      // ---------------------------------------------------------
      // 7. OPERATIONAL INSIGHTS
      // ---------------------------------------------------------
      writeSectionHeader("Operational Insights");

      let insight1 = cpuTrend === "stable" ? "System performance remained stable during most operational periods." : "System performance exhibited fluctuations tracking with dynamic workloads.";
      let insight2 = memSpikes > 0 ? `Moderate memory spikes (${memSpikes} occurrences) were detected during peak utilization intervals.` : "Memory allocation remained consistent without abnormal spiking patterns.";
      let insight3 = avgUtilization > 80 ? "Sustained infrastructure saturation patterns were observed, indicating capacity limits." : "No sustained infrastructure saturation patterns were observed.";

      writeProfessionalPoint("Performance Insight", insight1);
      writeProfessionalPoint("Memory Insight", insight2);
      writeProfessionalPoint("Saturation Insight", insight3);

      // ---------------------------------------------------------
      // 8. RECOMMENDATIONS
      // ---------------------------------------------------------
      writeSectionHeader("Recommendations");

      writeProfessionalPoint("Memory Allocation", memTrend === "increasing" || peakMem > 85 ? "Continue monitoring memory growth trends and investigate potential leaks." : "Memory levels are healthy; no immediate action required regarding RAM.");
      writeProfessionalPoint("Compute Optimization", cpuSpikes > 5 ? "Investigate recurring CPU spikes during peak utilization windows to prevent throttling." : "Current CPU allocation strategies are effective.");
      writeProfessionalPoint("Capacity Planning", avgUtilization < 70 ? "Current infrastructure capacity appears sufficient for observed workloads." : "Consider proactive infrastructure scaling to accommodate growing resource demands.");

      // ---------------------------------------------------------
      // 10. RISK ASSESSMENT
      // ---------------------------------------------------------
      writeSectionHeader("Risk Assessment");

      const getRisk = (val, highThresh, medThresh) => val > highThresh ? "HIGH" : val > medThresh ? "MODERATE" : "LOW";
      let infraRisk = getRisk(avgUtilization, 80, 60);
      let satRisk = getRisk(Math.max(peakCpu, peakMem), 90, 75);
      let stabRisk = getRisk(100 - stabilityScore, 20, 10);
      if (healthStatus === "CRITICAL") infraRisk = "CRITICAL";

      writeProfessionalPoint("Infrastructure Risk", infraRisk);
      writeProfessionalPoint("Resource Saturation Risk", satRisk);
      writeProfessionalPoint("Service Stability Risk", stabRisk);
      writeProfessionalPoint("Incident Probability", infraRisk === "HIGH" || satRisk === "HIGH" ? "ELEVATED" : "LOW");

      // ---------------------------------------------------------
      // 9. VISUAL ANALYTICS (CHARTS)
      // ---------------------------------------------------------
      writeSectionHeader("Visual Analytics");

      const drawLineChart = (title, field, color) => {
         if (doc.y + 160 > 750) {
             doc.addPage();
         }
         
         const chartStartY = doc.y;
         doc.x = 50;
         doc.fillColor("#333333").fontSize(11).font("Helvetica-Bold").text(title, { align: "left" });
         
         const chartX = 50;
         const chartY = chartStartY + 20;
         const chartW = 445;
         const chartH = 100;

         // Dynamic Y-Axis scaling
         let maxVal = Math.max(...data.map(r => Number(r[field] || 0)));
         let yAxisMax = 100;
         if (maxVal < 10) yAxisMax = 20;
         else if (maxVal < 50) yAxisMax = 50;

         // Draw axes
         doc.moveTo(chartX, chartY).lineTo(chartX, chartY + chartH).strokeColor("#D1D5DB").lineWidth(1).stroke();
         doc.moveTo(chartX, chartY + chartH).lineTo(chartX + chartW, chartY + chartH).strokeColor("#D1D5DB").lineWidth(1).stroke();

         // Y-Axis labels
         doc.fillColor("#9CA3AF").fontSize(8).font("Helvetica");
         doc.text(`${yAxisMax}%`, chartX - 30, chartY - 4, { align: "left" });
         doc.text(`${yAxisMax/2}%`, chartX - 25, chartY + (chartH/2) - 4, { align: "left" });
         doc.text("0%", chartX - 20, chartY + chartH - 4, { align: "left" });

         if (data.length < 2) {
            doc.fillColor("#9CA3AF").fontSize(10).font("Helvetica").text("Insufficient data to render chart.", chartX + 10, chartY + 45, { align: "left" });
            doc.y = chartY + chartH + 30; // Move doc.y past chart
            return;
         }

         // Draw path
         doc.strokeColor(color).lineWidth(2);
         const stepX = chartW / (data.length - 1);
         data.forEach((row, idx) => {
            const val = Number(row[field] || 0);
            // Cap at yAxisMax just in case
            const boundedVal = Math.min(val, yAxisMax);
            const pxX = chartX + (idx * stepX);
            const pxY = chartY + chartH - ((boundedVal / yAxisMax) * chartH);
            
            if (idx === 0) doc.moveTo(pxX, pxY);
            else doc.lineTo(pxX, pxY);
         });
         doc.stroke();
         
         doc.y = chartY + chartH + 30;
      };

      drawLineChart("CPU Utilization Trend", "cpu_usage", "#3B82F6"); // Blue
      drawLineChart("Memory Allocation Trend", "memory_usage", "#10B981"); // Green

      if (isError) {
         drawLineChart("Error Frequency Trend", "error_rate", "#EF4444"); // Red
      }

      // ---------------------------------------------------------
      // FOOTER INJECTION
      // ---------------------------------------------------------
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.moveTo(50, 760).lineTo(545, 760).strokeColor("#E5E7EB").lineWidth(1).stroke();
        
        doc.x = 50;
        doc.fillColor("#9CA3AF").fontSize(8).font("Helvetica");
        
        let footerY = 770;
        doc.text("Generated by Nebula Observability Platform", 50, footerY, { align: "left" });
        doc.text("CONFIDENTIAL - ENTERPRISE MONITORING ANALYTICS", 50, footerY, { align: "center" });
        doc.text(`Page ${i + 1} of ${pages.count}`, 50, footerY, { align: "right" });
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