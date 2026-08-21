const pool = require("../config/db");

// Get historical server metrics
exports.getServerMetrics = async (serverId, limit = 60) => {
  const query = `
    SELECT cpu_usage, memory_usage, disk_usage, thread_count, recorded_at
    FROM server_metrics
    WHERE server_id = $1
    ORDER BY recorded_at DESC
    LIMIT $2
  `;
  const { rows } = await pool.query(query, [serverId, limit]);
  return rows.reverse(); // Return in chronological order
};

// Get historical service metrics
exports.getServiceMetrics = async (serviceId, timeRange = '1h', limit = 60) => {
  // NOTE: disk_usage and thread_count columns are added via the one-time migration:
  // database/add_service_metric_columns.sql

  let intervalStr = '1 hour';
  let bucketSecs = 60;

  if (timeRange === '5m') { intervalStr = '5 minutes'; bucketSecs = 10; } // 10 sec bucket for 5m window
  else if (timeRange === '20m') { intervalStr = '20 minutes'; bucketSecs = 60; } // 1 min bucket
  else if (timeRange === '15m') { intervalStr = '15 minutes'; bucketSecs = 60; } // backward compatible
  else if (timeRange === '1h') { intervalStr = '1 hour'; bucketSecs = 60; } // 1 min bucket
  else if (timeRange === '6h') { intervalStr = '6 hours'; bucketSecs = 300; } // 5 min bucket
  else if (timeRange === '24h') { intervalStr = '24 hours'; bucketSecs = 900; } // 15 min bucket
  else if (timeRange === '7d') { intervalStr = '7 days'; bucketSecs = 3600; } // 1 hour bucket

  const query = `
    SELECT 
      to_timestamp(floor(extract(epoch from recorded_at) / $2) * $2) as recorded_at,
      AVG(cpu_usage) as cpu_usage,
      AVG(memory_usage) as memory_usage,
      AVG(disk_usage) as disk_usage,
      AVG(thread_count) as thread_count
    FROM service_metrics
    WHERE service_id = $1 AND recorded_at >= (SELECT MAX(recorded_at) FROM service_metrics WHERE service_id = $1) - INTERVAL '${intervalStr}'
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT $3
  `;
  const { rows } = await pool.query(query, [serviceId, bucketSecs, limit]);
  return rows.reverse();
};

// Get aggregated server metrics for dashboard
// NOTE: The WHERE clause prevents a full-table scan over all historical data.
exports.getAggregatedServerMetrics = async (limit = 20) => {
  const query = `
    SELECT 
      date_trunc('minute', recorded_at) as time,
      AVG(cpu_usage) as avg_cpu,
      AVG(memory_usage) as avg_memory
    FROM server_metrics
    WHERE recorded_at >= NOW() - INTERVAL '1 hour'
    GROUP BY time
    ORDER BY time DESC
    LIMIT $1
  `;
  const { rows } = await pool.query(query, [limit]);
  return rows.reverse();
};

// Get baseline bounds from ML anomalies
exports.getServerBaselines = async (serverId, minutes = 60) => {
  const query = `
    SELECT 
      window_start as recorded_at,
      baseline as cpu_baseline,
      lower_bound as cpu_lower,
      upper_bound as cpu_upper,
      metric_name
    FROM metric_baselines
    WHERE entity_type = 'server' 
      AND entity_id = $1
      AND window_start >= (SELECT MAX(recorded_at) FROM server_metrics WHERE server_id = $1) - ($2 || ' minutes')::INTERVAL
    ORDER BY window_start DESC
  `;
  const { rows } = await pool.query(query, [serverId, minutes]);
  return rows.reverse();
};

exports.getServiceBaselines = async (serviceId, minutes = 60) => {
  const query = `
    SELECT 
      window_start as recorded_at,
      baseline as cpu_baseline,
      lower_bound as cpu_lower,
      upper_bound as cpu_upper,
      metric_name
    FROM metric_baselines
    WHERE entity_type = 'service'
      AND entity_id = $1
      AND window_start >= (SELECT MAX(recorded_at) FROM service_metrics WHERE service_id = $1) - ($2 || ' minutes')::INTERVAL
    ORDER BY window_start DESC
  `;
  const { rows } = await pool.query(query, [serviceId, minutes]);
  return rows.reverse();
};
