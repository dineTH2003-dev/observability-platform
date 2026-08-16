const pool = require("../config/db");
const cache = require("../utils/cache");

const DASHBOARD_CACHE_KEY = 'dashboard:summary';
const DASHBOARD_TTL_MS = 15_000; // 15 seconds

exports.getDashboardSummary = async () => {
  // Return cached result if fresh — avoids 5 DB queries on every poll cycle.
  const cached = cache.get(DASHBOARD_CACHE_KEY);
  if (cached) return cached;

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
  // Uses FILTER clauses instead of 8 correlated subqueries — 3 single-pass scans vs 8 sequential ones.
  const healthQueryPromise = pool.query(`
    WITH
      server_counts AS (
        SELECT
          COUNT(*) FILTER (WHERE server_status = 'CRITICAL') AS critical_servers,
          COUNT(*) FILTER (WHERE server_status = 'WARNING')  AS warning_servers,
          COUNT(*)                                           AS total_servers
        FROM servers
      ),
      app_counts AS (
        SELECT
          COUNT(*) FILTER (WHERE application_status = 'DOWN')     AS critical_apps,
          COUNT(*) FILTER (WHERE application_status = 'WARNING')  AS warning_apps,
          COUNT(*)                                                 AS total_apps
        FROM applications
      ),
      service_counts AS (
        SELECT
          COUNT(*) FILTER (WHERE status = 'ERROR')   AS critical_services,
          COUNT(*) FILTER (WHERE status = 'STOPPED') AS warning_services,
          COUNT(*)                                   AS total_services
        FROM services
      ),
      issue_counts AS (
        SELECT
          COUNT(*) FILTER (WHERE status = 'detected') AS active_anomalies
        FROM anomalies
      ),
      incident_counts AS (
        SELECT
          COUNT(*) FILTER (WHERE status = 'open') AS open_incidents
        FROM incidents
      )
    SELECT
      sc.critical_servers, sc.warning_servers, sc.total_servers,
      ac.critical_apps,    ac.warning_apps,    ac.total_apps,
      svc.critical_services, svc.warning_services, svc.total_services,
      ic.active_anomalies,
      inc.open_incidents
    FROM server_counts sc, app_counts ac, service_counts svc, issue_counts ic, incident_counts inc;
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

  const result = {
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

  // Cache so subsequent requests within 15s skip all DB queries.
  cache.set(DASHBOARD_CACHE_KEY, result, DASHBOARD_TTL_MS);

  return result;
};

