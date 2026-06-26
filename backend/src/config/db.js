const { Pool } = require("pg");
const env = require("./env");
const logger = require("./logger");

const pool = new Pool({
  user: env.db.user,
  host: env.db.host,
  database: env.db.database,
  password: env.db.password,
  port: env.db.port,
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("connect", () => logger.info({ msg: "Connected to PostgreSQL" }));
pool.on("error", (err) => logger.error({ msg: "PostgreSQL pool error", err }));

async function connectDatabase() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    logger.info({ msg: "Database connection verified" });
  } finally {
    client.release();
  }
}

module.exports = pool;
module.exports.connectDatabase = connectDatabase;