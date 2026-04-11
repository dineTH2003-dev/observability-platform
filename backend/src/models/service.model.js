const pool = require("../config/db");

exports.findAll = async () => {
  const { rows } = await pool.query(`
    SELECT
      s.service_id, s.server_id, s.application_id, s.name,
      s.service_identifier, s.process_id, s.technology,
      s.status, s.discovered_at, s.updated_at,
      a.name        AS application_name,
      srv.hostname  AS server_name,
      lc.log_path,
      lc.is_enabled AS logs_analyses_active
    FROM services s
    JOIN servers srv ON srv.server_id = s.server_id
    LEFT JOIN applications a  ON a.application_id = s.application_id
    LEFT JOIN log_configs  lc ON lc.service_id    = s.service_id
    ORDER BY s.updated_at DESC
  `);
  return rows;
};

exports.findByServerId = async (server_id) => {
  const { rows } = await pool.query(
    `SELECT service_id, name, status FROM services WHERE server_id = $1`,
    [server_id],
  );
  return rows;
};

exports.findById = async (service_id) => {
  const { rows } = await pool.query(
    `SELECT s.*, a.name AS application_name, srv.hostname AS server_name
     FROM services s
     JOIN servers srv ON srv.server_id = s.server_id
     LEFT JOIN applications a ON a.application_id = s.application_id
     WHERE s.service_id = $1`,
    [service_id],
  );
  return rows[0] ?? null;
};

// Upsert by (server_id, name) - handles PID changes on restart transparently
exports.upsert = async ({
  server_id,
  name,
  service_identifier,
  command,
  process_id,
  technology,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO services
       (server_id, name, service_identifier, command, process_id, technology, status, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,'RUNNING',NOW())
     ON CONFLICT (server_id, name)
     DO UPDATE SET
       service_identifier = EXCLUDED.service_identifier,
       command            = EXCLUDED.command,
       process_id         = EXCLUDED.process_id,
       technology         = EXCLUDED.technology,
       status             = 'RUNNING',
       updated_at         = NOW()
     RETURNING *`,
    [
      server_id,
      name,
      service_identifier ?? null,
      command ?? null,
      process_id ?? null,
      technology ?? null,
    ],
  );
  return rows[0];
};

// Mark STOPPED any service that was RUNNING but is absent from the new list
exports.markStopped = async (server_id, running_names) => {
  if (running_names.length === 0) {
    await pool.query(
      `UPDATE services SET status='STOPPED', process_id=NULL, updated_at=NOW()
       WHERE server_id=$1 AND status='RUNNING'`,
      [server_id],
    );
    return;
  }
  await pool.query(
    `UPDATE services SET status='STOPPED', process_id=NULL, updated_at=NOW()
     WHERE server_id=$1 AND status='RUNNING' AND name != ALL($2::text[])`,
    [server_id, running_names],
  );
};

exports.updateApplication = async (service_id, application_id) => {
  const { rows } = await pool.query(
    `UPDATE services SET application_id=$1 WHERE service_id=$2 RETURNING *`,
    [application_id, service_id],
  );
  return rows[0] ?? null;
};

exports.remove = async (service_id) => {
  await pool.query(`DELETE FROM services WHERE service_id=$1`, [service_id]);
};
