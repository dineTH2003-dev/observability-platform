// src/models/server_metric.model.js
const pool = require("../config/db");

exports.insert = async ({ server_id, cpu_usage, memory_usage, disk_usage, thread_count }) => {
  const { rows } = await pool.query(
    `INSERT INTO server_metrics (server_id, cpu_usage, memory_usage, disk_usage, thread_count)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [server_id, cpu_usage ?? null, memory_usage ?? null, disk_usage ?? null, thread_count ?? null],
  );
  return rows[0];
};
