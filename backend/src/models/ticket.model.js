const pool = require("../config/db");

exports.count = async () => {
  const { rows } = await pool.query("SELECT COUNT(*) FROM tickets");
  return parseInt(rows[0].count, 10);
};

exports.insert = async ({ ticket_id, title, purpose, context, priority }) => {
  const { rows } = await pool.query(
    `INSERT INTO tickets (ticket_id, title, purpose, context, priority)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [ticket_id, title, purpose, context, priority]
  );
  return rows[0];
};

exports.find = async ({ search, status, priority, purpose }) => {
  let query = `SELECT * FROM tickets WHERE 1=1`;
  const values = [];
  let i = 1;

  if (search) {
    query += ` AND (ticket_id ILIKE $${i} OR title ILIKE $${i} OR context ILIKE $${i} OR purpose::text ILIKE $${i})`;
    values.push(`%${search}%`);
    i++;
  }

  if (status && status.toLowerCase() !== "all") {
    query += ` AND lower(status::text) = lower($${i})`;
    values.push(status);
    i++;
  }

  if (priority && priority.toLowerCase() !== "all") {
    query += ` AND lower(priority::text) = lower($${i})`;
    values.push(priority);
    i++;
  }

  if (purpose && purpose.toLowerCase() !== "all") {
    query += ` AND lower(purpose::text) = lower($${i})`;
    values.push(purpose);
    i++;
  }

  query += ` ORDER BY created_at DESC`;

  const { rows } = await pool.query(query, values);
  return rows;
};
