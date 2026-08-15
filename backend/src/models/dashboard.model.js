const pool = require("../config/db");

exports.getDashboardSummary = async () => {
  // 1. Open Incidents
  const openIncidentsPromise = pool.query(`
    SELECT i.incident_id as id, i.incident_number, i.title, i.severity, i.status, 
           i.created_at, u.email as assigned_to
    FROM incidents i
    LEFT JOIN users u ON i.assigned_to = u.id
    WHERE i.status = 'open'
    ORDER BY i.created_at DESC
    LIMIT 4
  `);

  // 2. Top Affected Resources
  const topAffectedPromise = pool.query(`
    SELECT 
      s.hostname as name,
      COUNT(a.anomaly_id) as "anomalyCount",
      CASE
        WHEN s.server_status = 'CRITICAL' THEN 'critical'
        WHEN s.server_status = 'WARNING' THEN 'degraded'
        WHEN s.server_status = 'HEALTHY' THEN 'healthy'
        ELSE 'unknown'
      END as status,
      CASE
        WHEN s.server_status = 'CRITICAL' THEN 35
        WHEN s.server_status = 'WARNING' THEN 65
        WHEN s.server_status = 'HEALTHY' THEN 100
        ELSE 0
      END as health
    FROM servers s
    JOIN anomalies a ON s.server_id = a.server_id
    WHERE a.status = 'detected'
    GROUP BY s.server_id, s.hostname, s.server_status
    ORDER BY "anomalyCount" DESC
    LIMIT 5
  `);

  // 3. Metrics Overview
  const metricsDataPromise = pool.query(`
    SELECT 
      date_trunc('minute', recorded_at) as time,
      AVG(cpu_usage) as avg_cpu,
      AVG(memory_usage) as avg_memory,
      AVG(disk_usage) as avg_disk,
      AVG(thread_count) as avg_thread_count
    FROM server_metrics
    WHERE recorded_at >= NOW() - INTERVAL '1 hour'
    GROUP BY time
    ORDER BY time ASC
    LIMIT 60
  `);

  // 4. Anomaly Trend
  const anomalyTrendPromise = pool.query(`
    WITH time_series AS (
      SELECT generate_series(
        date_trunc('hour', NOW()) - INTERVAL '24 hours',
        date_trunc('hour', NOW()),
        '4 hours'::interval
      ) as time
    )
    SELECT 
      ts.time,
      COUNT(a.anomaly_id) as anomalies
    FROM time_series ts
    LEFT JOIN anomalies a 
      ON a.detected_at >= ts.time AND a.detected_at < ts.time + INTERVAL '4 hours'
    GROUP BY ts.time
    ORDER BY ts.time ASC
  `);

  // 5. KPI and composite system health counts
  const healthQueryPromise = pool.query(`
    WITH ComponentHealth AS (
      SELECT 
        (SELECT COUNT(*) FROM servers WHERE server_status = 'CRITICAL') as critical_servers,
        (SELECT COUNT(*) FROM servers WHERE server_status = 'WARNING') as warning_servers,
        (SELECT COUNT(*) FROM servers) as total_servers,
        (SELECT COUNT(*) FROM applications WHERE application_status = 'DOWN') as critical_apps,
        (SELECT COUNT(*) FROM applications WHERE application_status = 'WARNING') as warning_apps,
        (SELECT COUNT(*) FROM applications) as total_apps,
        (SELECT COUNT(*) FROM services WHERE status = 'ERROR') as critical_services,
        (SELECT COUNT(*) FROM services WHERE status = 'STOPPED') as warning_services,
        (SELECT COUNT(*) FROM services) as total_services,
        (SELECT COUNT(*) FROM anomalies WHERE status = 'detected') as active_anomalies,
        (SELECT COUNT(*) FROM incidents WHERE status = 'open') as open_incidents
    )
    SELECT * FROM ComponentHealth;
  `);

  const [
    { rows: openIncidents },
    { rows: topAffected },
    { rows: metricsData },
    { rows: anomalyTrend },
    { rows: healthQuery },
  ] = await Promise.all([
    openIncidentsPromise,
    topAffectedPromise,
    metricsDataPromise,
    anomalyTrendPromise,
    healthQueryPromise,
  ]);

  const ch = healthQuery[0];
  const tServers = Number(ch.total_servers) || 0;
  const tApps = Number(ch.total_apps) || 0;
  const tServices = Number(ch.total_services) || 0;
  
  // Start with 100% health
  let systemHealth = 100;

  // Deduct points for critical and warning components
  const criticalComponents = Number(ch.critical_servers) + Number(ch.critical_apps) + Number(ch.critical_services);
  const warningComponents = Number(ch.warning_servers) + Number(ch.warning_apps) + Number(ch.warning_services);

  systemHealth -= (criticalComponents * 10); // 10% penalty per critical component
  systemHealth -= (warningComponents * 5);   // 5% penalty per warning component

  // Deduct points for active issues
  const activeAnomaliesVal = Number(ch.active_anomalies) || 0;
  const openIncidentsVal = Number(ch.open_incidents) || 0;

  systemHealth -= (activeAnomaliesVal * 2); // 2% penalty per anomaly
  systemHealth -= (openIncidentsVal * 5);   // 5% penalty per incident

  // Clamp between 0 and 100
  systemHealth = Math.max(0, Math.min(100, Math.round(systemHealth)));

  return {
    kpis: {
      hosts: tServers,
      applications: tApps,
      services: tServices,
      activeAnomalies: activeAnomaliesVal,
      openIncidents: openIncidentsVal,
      systemHealth,
    },
    openIncidents: openIncidents.map(i => ({
      id: `INC-${i.incident_number}`,
      title: i.title,
      severity: i.severity,
      status: i.status,
      assignedTo: i.assigned_to || 'Unassigned',
      duration: Math.floor((Date.now() - new Date(i.created_at).getTime()) / 60000) + 'm',
      hasRecommendation: false
    })),
    topAffectedResources: topAffected,
    metricsOverview: metricsData,
    anomalyTrend: anomalyTrend
  };
};
