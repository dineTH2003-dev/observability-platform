const db = require("../config/db");

// 1. Infrastructure Health Report
const getInfrastructureHealthReport = async (serverId, start, end) => {
  let query = `
    SELECT 
      sm.recorded_at as time,
      sm.cpu_usage as cpu,
      sm.memory_usage as memory,
      sm.disk_usage as disk,
      s.server_status,
      s.hostname
    FROM server_metrics sm
    JOIN servers s ON sm.server_id = s.server_id
    WHERE sm.recorded_at BETWEEN $1 AND $2
  `;
  const params = [start, end];

  if (serverId) {
    query += ` AND sm.server_id = $3`;
    params.push(serverId);
  }

  query += ` ORDER BY sm.recorded_at ASC`;
  return db.query(query, params);
};

// 2. Service Performance Report
const getServicePerformanceReport = async (serviceId, start, end) => {
  let query = `
    SELECT 
      sm.recorded_at as time,
      sm.cpu_usage as cpu,
      sm.memory_usage as memory,
      s.status as service_status,
      s.name as service_name
    FROM service_metrics sm
    JOIN services s ON sm.service_id = s.service_id
    WHERE sm.recorded_at BETWEEN $1 AND $2
  `;
  const params = [start, end];

  if (serviceId) {
    query += ` AND sm.service_id = $3`;
    params.push(serviceId);
  }

  query += ` ORDER BY sm.recorded_at ASC`;
  return db.query(query, params);
};

// 3. Incident & Anomaly Report
const getIncidentAnomalyReport = async (start, end) => {
  const anomaliesQuery = `
    SELECT 
      detected_at as time,
      severity,
      status,
      anomaly_type,
      title
    FROM anomalies
    WHERE detected_at BETWEEN $1 AND $2
    ORDER BY detected_at ASC
  `;
  const incidentsQuery = `
    SELECT 
      created_at as time,
      severity,
      status,
      title
    FROM incidents
    WHERE created_at BETWEEN $1 AND $2
    ORDER BY created_at ASC
  `;
  
  const [anomalies, incidents] = await Promise.all([
    db.query(anomaliesQuery, [start, end]),
    db.query(incidentsQuery, [start, end])
  ]);
  
  return {
    anomalies: anomalies.rows,
    incidents: incidents.rows
  };
};

// 4. System Reliability Report
const getSystemReliabilityReport = async (start, end) => {
  const query = `
    WITH incident_stats AS (
      SELECT 
        COUNT(*) as total_incidents,
        COUNT(resolved_at) as resolved_incidents,
        AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at))) as mttd_seconds,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as mttr_seconds,
        SUM(EXTRACT(EPOCH FROM (resolved_at - created_at))) FILTER (WHERE severity = 'critical') as critical_downtime_seconds
      FROM incidents
      WHERE created_at BETWEEN $1 AND $2
    )
    SELECT 
      total_incidents,
      resolved_incidents,
      COALESCE(mttd_seconds, 0) as mttd_seconds,
      COALESCE(mttr_seconds, 0) as mttr_seconds,
      COALESCE(critical_downtime_seconds, 0) as critical_downtime_seconds,
      EXTRACT(EPOCH FROM ($2::timestamp - $1::timestamp)) as total_period_seconds
    FROM incident_stats
  `;
  
  return db.query(query, [start, end]);
};

module.exports = {
  getInfrastructureHealthReport,
  getServicePerformanceReport,
  getIncidentAnomalyReport,
  getSystemReliabilityReport,
};