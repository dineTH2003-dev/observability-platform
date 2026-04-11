const pool = require("../config/db");

exports.findByServiceId = async (service_id) => {
  const { rows } = await pool.query(
    `SELECT * FROM log_configs WHERE service_id = $1`, [service_id],
  );
  return rows[0] ?? null;
};

exports.upsertForService = async (service_id, { log_path, is_enabled }) => {
  const { rows } = await pool.query(
    `INSERT INTO log_configs (service_id, log_path, is_enabled)
     VALUES ($1, $2, $3)
     ON CONFLICT (service_id)
     DO UPDATE SET log_path = EXCLUDED.log_path,
                   is_enabled = EXCLUDED.is_enabled,
                   updated_at = NOW()
     RETURNING *`,
    [service_id, log_path, is_enabled ?? true],
  );
  return rows[0];
};
