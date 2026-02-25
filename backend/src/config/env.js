const dotenv = require("dotenv");
dotenv.config();

function requireEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 9000),

  db: {
    user: requireEnv("DB_USER"),
    host: requireEnv("DB_HOST"),
    database: requireEnv("DB_NAME"),
    password: requireEnv("DB_PASSWORD"),
    port: Number(process.env.DB_PORT || 5432),
    // optional:
    ssl: process.env.DB_SSL === "true",
  },

  jwt: {
    secret: requireEnv("JWT_SECRET"),
  },
};

module.exports = env;