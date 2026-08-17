const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redisClient = null;
let isRedisAvailable = false;
let warningLogged = false;

try {
  redisClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 3) {
        if (!warningLogged) {
          console.warn('[Redis] Redis server unreachable. Gracefully falling back to in-memory/DB queries.');
          warningLogged = true;
        }
        return null; // Stop retrying automatically
      }
      return Math.min(times * 200, 1000);
    },
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    warningLogged = false;
    console.log(`[Redis] Connected successfully to ${REDIS_HOST}:${REDIS_PORT}`);
  });

  redisClient.on('error', (err) => {
    isRedisAvailable = false;
    if (!warningLogged) {
      console.warn(`[Redis] Notice: ${err.message}. Using fallback in-memory engine.`);
      warningLogged = true;
    }
  });
} catch (err) {
  isRedisAvailable = false;
  console.warn('[Redis] Initialization skipped:', err.message);
}

module.exports = {
  getClient: () => redisClient,
  isAvailable: () => isRedisAvailable && redisClient && redisClient.status === 'ready',
};
