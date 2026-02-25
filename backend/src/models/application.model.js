const pool = require("../config/db");

exports.create = async ({ name, description, version, server_id, status }) => {
  const query = `
    INSERT INTO applications (name, description, version, server_id, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const { rows } = await pool.query(query, [name, description, version, server_id, status]);
  return rows[0];
};

exports.findAll = async () => {
  const { rows } = await pool.query(
    "SELECT * FROM applications ORDER BY created_at DESC"
  );
  return rows;
};

exports.findById = async (id) => {
  const { rows } = await pool.query(
    "SELECT * FROM applications WHERE application_id = $1",
    [id]
  );
  return rows[0];
};

exports.update = async (id, data) => {
  const { name, description, environment } = data;

  const query = `
    UPDATE applications
    SET name=$1, description=$2, environment=$3, updated_at=CURRENT_TIMESTAMP
    WHERE application_id=$4
    RETURNING *
  `;

  const { rows } = await pool.query(query, [
    name,
    description,
    environment,
    id,
  ]);

  return rows[0];
};

exports.remove = async (application_id) => {
  await pool.query("DELETE FROM applications WHERE application_id=$1", [application_id]);
};