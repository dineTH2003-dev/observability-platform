const pool = require("../config/db");
const ServerMetricModel = require("../models/server_metric.model");
const ServiceModel = require("../models/service.model");
const ServiceMetricModel = require("../models/service_metric.model");
const ApiError = require("../utils/apiError");
const logger = require("../config/logger");

// Heartbeat
exports.heartbeat = async (server_id) => {
  const normalizedServerId = normalizePositiveInt(server_id, "server_id");
  const { rows } = await pool.query(
    `UPDATE servers
     SET agent_status       = 'ACTIVE',
         last_discovered_at = NOW()
     WHERE server_id = $1
     RETURNING server_id, hostname, agent_status, last_discovered_at`,
    [normalizedServerId],
  );
  if (!rows[0]) throw new ApiError(404, `Server ${normalizedServerId} not found`);

  // Fetch active log configs for this server
  const { rows: logConfigs } = await pool.query(
    `SELECT lc.service_id, s.name as service_name, lc.log_path
     FROM log_configs lc
     JOIN services s ON s.service_id = lc.service_id
     WHERE s.server_id = $1 AND lc.is_enabled = TRUE`,
    [normalizedServerId],
  );

  return {
    ...rows[0],
    log_configs: logConfigs,
  };
};

// Server metrics
exports.ingestMetrics = async (
  server_id,
  { cpu_usage, memory_usage, disk_usage, thread_count },
) => {
  const normalizedServerId = normalizePositiveInt(server_id, "server_id");
  const metrics = normalizeServerMetrics({
    cpu_usage,
    memory_usage,
    disk_usage,
    thread_count,
  });

  await ensureServerExists(normalizedServerId);

  const metric = await ServerMetricModel.insert({
    server_id: normalizedServerId,
    ...metrics,
  });

  const server_status = deriveServerStatus(
    metrics.cpu_usage,
    metrics.memory_usage,
    metrics.disk_usage,
  );
  await pool.query(
    `UPDATE servers
     SET server_status = $1,
         agent_status = 'ACTIVE',
         last_discovered_at = NOW(),
         updated_at = NOW()
     WHERE server_id = $2`,
    [server_status, normalizedServerId],
  );

  return { metric, server_status };
};

// Service discovery + health tracking
exports.ingestDiscoveredServices = async (server_id, services) => {
  const normalizedServerId = normalizePositiveInt(server_id, "server_id");
  await ensureServerExists(normalizedServerId);

  if (!Array.isArray(services)) {
    throw new ApiError(400, "services must be an array");
  }

  if (services.length > 500) {
    throw new ApiError(400, "services payload exceeds maximum of 500 entries");
  }

  const normalizedServices = services.map((svc, index) =>
    normalizeServiceDiscoveryEntry(svc, index),
  );

  if (normalizedServices.length === 0) {
    await ServiceModel.markStopped(normalizedServerId, []);
    await markServerSeen(normalizedServerId);
    return { upserted: 0, metrics: [] };
  }

  const runningNames = normalizedServices.map((s) => s.name);

  await ServiceModel.markStopped(normalizedServerId, runningNames);

  let upserted = 0;
  const insertedMetrics = [];
  for (const svc of normalizedServices) {
    const row = await ServiceModel.upsert({
      server_id: normalizedServerId,
      name: svc.name,
      service_identifier: svc.service_identifier,
      command: svc.command,
      process_id: svc.process_id,
      technology: svc.technology,
    });

    if (svc.cpu_usage != null || svc.memory_usage != null) {
      const metric = await ServiceMetricModel.insert({
        service_id: row.service_id,
        cpu_usage: svc.cpu_usage,
        memory_usage: svc.memory_usage,
      });
      insertedMetrics.push(metric);
    }
    upserted++;
  }

  await markServerSeen(normalizedServerId);
  return { upserted, metrics: insertedMetrics };
};

async function ensureServerExists(server_id) {
  const { rows } = await pool.query(
    `SELECT server_id FROM servers WHERE server_id = $1`,
    [server_id],
  );
  if (!rows[0]) {
    throw new ApiError(404, `Server ${server_id} not found`);
  }
}

async function markServerSeen(server_id) {
  await pool.query(
    `UPDATE servers
     SET agent_status = 'ACTIVE',
         last_discovered_at = NOW(),
         updated_at = NOW()
     WHERE server_id = $1`,
    [server_id],
  );
}

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

function normalizeServerMetrics(metrics) {
  return {
    cpu_usage: normalizePercent(metrics.cpu_usage, "cpu_usage"),
    memory_usage: normalizePercent(metrics.memory_usage, "memory_usage"),
    disk_usage: normalizePercent(metrics.disk_usage, "disk_usage"),
    thread_count: normalizeNonNegativeInt(metrics.thread_count, "thread_count", {
      required: false,
      max: 10_000_000,
    }),
  };
}

function normalizeServiceDiscoveryEntry(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ApiError(400, `services[${index}] must be an object`);
  }

  const name = normalizeRequiredString(raw.name, `services[${index}].name`, 255);

  return {
    name,
    service_identifier: normalizeOptionalString(
      raw.service_identifier,
      `services[${index}].service_identifier`,
      255,
    ),
    command: normalizeOptionalString(raw.command, `services[${index}].command`, 500),
    process_id: normalizeNonNegativeInt(raw.process_id, `services[${index}].process_id`, {
      required: false,
      max: 4_194_304,
    }),
    technology: normalizeOptionalString(raw.technology, `services[${index}].technology`, 100),
    cpu_usage: normalizeNumberInRange(raw.cpu_usage, `services[${index}].cpu_usage`, {
      required: false,
      min: 0,
      max: 1000,
    }),
    memory_usage: normalizePercent(raw.memory_usage, `services[${index}].memory_usage`, {
      required: false,
    }),
  };
}

function normalizePositiveInt(value, field) {
  const parsed = normalizeNonNegativeInt(value, field, { required: true, max: 2_147_483_647 });
  if (parsed <= 0) {
    throw new ApiError(400, `${field} must be a positive integer`);
  }
  return parsed;
}

function normalizePercent(value, field, options = {}) {
  return normalizeNumberInRange(value, field, {
    required: options.required !== false,
    min: 0,
    max: 100,
  });
}

function normalizeNumberInRange(value, field, { required = true, min, max }) {
  if (value === null || value === undefined || value === "") {
    if (!required) return null;
    throw new ApiError(400, `${field} is required`);
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new ApiError(400, `${field} must be a finite number`);
  }
  if (number < min || number > max) {
    throw new ApiError(400, `${field} must be between ${min} and ${max}`);
  }
  return Number(number.toFixed(4));
}

function normalizeNonNegativeInt(value, field, { required = true, max }) {
  if (value === null || value === undefined || value === "") {
    if (!required) return null;
    throw new ApiError(400, `${field} is required`);
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > max) {
    throw new ApiError(400, `${field} must be an integer between 0 and ${max}`);
  }
  return number;
}

function normalizeRequiredString(value, field, maxLength) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new ApiError(400, `${field} is required`);
  }
  if (text.length > maxLength) {
    throw new ApiError(400, `${field} cannot exceed ${maxLength} characters`);
  }
  return text;
}

function normalizeOptionalString(value, field, maxLength) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) {
    throw new ApiError(400, `${field} cannot exceed ${maxLength} characters`);
  }
  return text;
}

exports.ingestLogs = async (server_id, logs) => {
  const normalizedServerId = normalizePositiveInt(server_id, "server_id");
  await ensureServerExists(normalizedServerId);

  if (!Array.isArray(logs)) {
    throw new ApiError(400, "logs must be an array");
  }

  if (logs.length === 0) return 0;

  let inserted = 0;
  for (const log of logs) {
    const { service_id, timestamp, level, message } = log;
    if (!service_id || !level || !message) continue;

    await pool.query(
      `INSERT INTO logs (server_id, service_id, timestamp, level, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        normalizedServerId,
        Number(service_id),
        timestamp ? new Date(timestamp) : new Date(),
        level.toLowerCase(),
        message
      ]
    );
    inserted++;
  }

  try {
    const { getIO } = require("../socket");
    const io = getIO();
    io.emit("live_log", { server_id: normalizedServerId, logs_count: inserted });
  } catch (err) {
    logger.error({ msg: "Socket emit failed for logs", error: err.message });
  }

  return inserted;
};
