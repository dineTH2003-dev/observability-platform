const pool = require("../config/db");

exports.create = async (data) => {
  const {
    hostname,
    ip_address,
    os,
    environment,
    server_status,
    agent_status,
    username,
    ssh_port,
  } = data;

  const query = `
    INSERT INTO servers (
      hostname,
      ip_address,
      os,
      environment,
      server_status,
      agent_status,
      username,
      ssh_port
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
  `;

  const { rows } = await pool.query(query, [
    hostname,
    ip_address,
    os,
    environment,
    server_status || "ACTIVE",
    agent_status || "NOT_INSTALLED",
    username,
    ssh_port || 22,
  ]);

  return rows[0];
};

exports.findAll = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM servers ORDER BY created_at DESC`,
  );
  return rows;
};

exports.findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM servers WHERE server_id = $1`,
    [id],
  );
  return rows[0];
};

exports.update = async (id, data) => {
  const {
    hostname,
    ip_address,
    os,
    environment,
    server_status,
    agent_status,
    username,
    ssh_port,
  } = data;

  const query = `
    UPDATE servers
    SET hostname=$1,
        ip_address=$2,
        os=$3,
        environment=$4,
        server_status=$5,
        agent_status=$6,
        username=$7,
        ssh_port=$8,
        updated_at=CURRENT_TIMESTAMP
    WHERE server_id=$9
    RETURNING *
  `;

  const { rows } = await pool.query(query, [
    hostname,
    ip_address,
    os,
    environment,
    server_status,
    agent_status,
    username,
    ssh_port,
    id,
  ]);

  return rows[0];
};

exports.remove = async (id) => {
  await pool.query(`DELETE FROM servers WHERE server_id=$1`, [id]);
};
