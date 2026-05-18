const dotenv = require("dotenv");
dotenv.config();

function requireEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function optionalEnv(name, fallback = "") {
  const val = process.env[name];
  return val == null ? fallback : val;
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
    ssl: process.env.DB_SSL === "true",
  },

  jwt: {
    secret: requireEnv("JWT_SECRET"),
    refreshSecret: requireEnv("JWT_REFRESH_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  JWT_ACCESS_SECRET: requireEnv("JWT_SECRET"),
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  FRONTEND_URL: requireEnv("FRONTEND_URL"),

  EMAIL_HOST: optionalEnv("EMAIL_HOST"),
  EMAIL_PORT: Number(process.env.EMAIL_PORT || 587),
  EMAIL_USER: optionalEnv("EMAIL_USER"),
  EMAIL_PASS: optionalEnv("EMAIL_PASS"),
};

module.exports = env;
