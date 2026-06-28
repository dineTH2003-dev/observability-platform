const pool = require("../config/db");

exports.findAll = async ({ level, service, host, search, limit = 100 } = {}) => {
  let queryText = `
    SELECT
      l.id,
      l.timestamp,
      l.level,
      l.message,
      s.name AS service,
      srv.hostname AS host
    FROM logs l
    JOIN services s ON s.service_id = l.service_id
    JOIN servers srv ON srv.server_id = l.server_id
  `;

  const values = [];
  const conditions = [];

  if (level && level !== "all") {
    values.push(level.toLowerCase());
    conditions.push(`l.level = $${values.length}`);
  }

  if (service && service !== "all") {
    values.push(service);
    conditions.push(`s.name = $${values.length}`);
  }

  if (host && host !== "all") {
    values.push(host);
    conditions.push(`srv.hostname = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`l.message ILIKE $${values.length}`);
  }

  if (conditions.length > 0) {
    queryText += " WHERE " + conditions.join(" AND ");
  }

  queryText += " ORDER BY l.timestamp DESC";

  if (limit) {
    values.push(Number(limit));
    queryText += ` LIMIT $${values.length}`;
  }

  const { rows } = await pool.query(queryText, values);
  return rows;
};
