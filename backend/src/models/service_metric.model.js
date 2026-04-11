const pool = require("../config/db");

exports.insert = async ({ service_id, cpu_usage, memory_usage }) => {
  const { rows } = await pool.query(
    `INSERT INTO service_metrics (service_id, cpu_usage, memory_usage)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [service_id, cpu_usage ?? null, memory_usage ?? null],
  );
  return rows[0];
};
