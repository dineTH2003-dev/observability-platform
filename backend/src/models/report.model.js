const db = require("../config/db");

// 🖥️ Server metrics
const getServerMetrics = async (serverId, start, end) => {
  return db.query(
    `
    SELECT *
    FROM server_metrics
    WHERE server_id = $1
      AND recorded_at BETWEEN $2 AND $3
    ORDER BY recorded_at ASC
    `,
    [serverId, start, end]
  );
};

// ⚙️ Single service metrics
const getServiceMetrics = async (serviceId, start, end) => {
  return db.query(
    `
    SELECT *
    FROM service_metrics
    WHERE service_id = $1
      AND recorded_at BETWEEN $2 AND $3
    ORDER BY recorded_at ASC
    `,
    [serviceId, start, end]
  );
};

// ⚙️ All services metrics
const getAllServiceMetrics = async (start, end) => {
  return db.query(
    `
    SELECT *
    FROM service_metrics
    WHERE recorded_at BETWEEN $1 AND $2
    ORDER BY recorded_at ASC
    `,
    [start, end]
  );
};

module.exports = {
  getServerMetrics,
  getServiceMetrics,
  getAllServiceMetrics,
};