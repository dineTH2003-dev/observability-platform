const pool = require("../config/db");
const ServerMetricModel = require("../models/server_metric.model");
const ServiceModel = require("../models/service.model");
const ServiceMetricModel = require("../models/service_metric.model");
const ApiError = require("../utils/apiError");
const logger = require("../config/logger");

// Heartbeat
exports.heartbeat = async (server_id) => {
  const { rows } = await pool.query(
    `UPDATE servers
     SET agent_status       = 'ACTIVE',
         last_discovered_at = NOW()
     WHERE server_id = $1
     RETURNING server_id, hostname, agent_status, last_discovered_at`,
    [server_id],
  );
  if (!rows[0]) throw new ApiError(404, `Server ${server_id} not found`);
  return rows[0];
};

// Server metrics
exports.ingestMetrics = async (
  server_id,
  { cpu_usage, memory_usage, disk_usage, thread_count },
) => {
  const { rows: check } = await pool.query(
    `SELECT server_id FROM servers WHERE server_id = $1`,
    [server_id],
  );
  if (!check[0]) throw new ApiError(404, `Server ${server_id} not found`);

  const metric = await ServerMetricModel.insert({
    server_id,
    cpu_usage,
    memory_usage,
    disk_usage,
    thread_count,
  });

  const server_status = deriveServerStatus(cpu_usage, memory_usage, disk_usage);
  await pool.query(
    `UPDATE servers SET server_status = $1 WHERE server_id = $2`,
    [server_status, server_id],
  );

  return { metric, server_status };
};

// Service discovery + health tracking
exports.ingestDiscoveredServices = async (server_id, services) => {
  if (!Array.isArray(services) || services.length === 0) {
    await ServiceModel.markStopped(server_id, []);
    return { upserted: 0 };
  }

  const runningNames = services.map((s) => s.name);

  await ServiceModel.markStopped(server_id, runningNames);

  let upserted = 0;
  for (const svc of services) {
    const row = await ServiceModel.upsert({
      server_id,
      name: svc.name,
      service_identifier: svc.service_identifier ?? null,
      command: svc.command ? svc.command.slice(0, 500) : null,
      process_id: svc.process_id ?? null,
      technology: svc.technology ?? null,
    });

    if (svc.cpu_usage != null || svc.memory_usage != null) {
      await ServiceMetricModel.insert({
        service_id: row.service_id,
        cpu_usage: svc.cpu_usage ?? null,
        memory_usage: svc.memory_usage ?? null,
      });
    }
    upserted++;
  }

  return { upserted };
};

// Stale agent sweep
exports.sweepStaleAgents = async (threshold_minutes = 10) => {
  const { rows: staleServers } = await pool.query(
    `SELECT server_id, hostname
     FROM servers
     WHERE agent_status       = 'ACTIVE'
       AND last_discovered_at < NOW() - ($1 || ' minutes')::INTERVAL`,
    [threshold_minutes],
  );

  if (staleServers.length === 0) return 0;

  const staleIds = staleServers.map((s) => s.server_id);

  await pool.query(
    `UPDATE servers
     SET agent_status  = 'INACTIVE',
         server_status = 'UNKNOWN'
     WHERE server_id = ANY($1::int[])`,
    [staleIds],
  );

  const { rowCount: servicesStopped } = await pool.query(
    `UPDATE services
     SET status     = 'STOPPED',
         process_id = NULL,
         updated_at = NOW()
     WHERE server_id = ANY($1::int[])
       AND status    = 'RUNNING'`,
    [staleIds],
  );

  for (const srv of staleServers) {
    logger.warn({
      msg: "Agent stale — marked INACTIVE",
      server_id: srv.server_id,
      hostname: srv.hostname,
      threshold: `${threshold_minutes} min`,
    });
  }

  if (servicesStopped > 0) {
    logger.warn({
      msg: "Services marked STOPPED due to stale agent",
      affected_servers: staleIds,
      services_stopped: servicesStopped,
    });
  }

  return staleServers.length;
};

// Helper
function deriveServerStatus(cpu, mem, disk) {
  const c = Number(cpu) || 0;
  const m = Number(mem) || 0;
  const d = Number(disk) || 0;
  if (c > 90 || m > 90 || d > 90) return "CRITICAL";
  if (c > 70 || m > 70 || d > 80) return "WARNING";
  return "HEALTHY";
}
