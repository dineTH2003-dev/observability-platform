/**
 * Multi-Tier Cache Utility: Redis Centralized Cache + In-Memory Fallback.
 */

const redisConfig = require('../config/redis');

// Secondary in-memory store for fallback or local caching
const memoryStore = new Map();

/**
 * Get cached item. Async aware for Redis, sync compatible for memory store.
 */
async function get(key) {
  if (redisConfig.isAvailable()) {
    try {
      const redis = redisConfig.getClient();
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      // Fall through to memory store if Redis query errors out
    }
  }

  // Memory fallback
  const entry = memoryStore.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Set cached item with TTL in milliseconds.
 */
async function set(key, value, ttlMs = 15_000) {
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

  if (redisConfig.isAvailable()) {
    try {
      const redis = redisConfig.getClient();
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      // Ignore Redis error and save to memory
    }
  }

  memoryStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Invalidate key or key pattern (ending with *).
 */
async function invalidate(...keys) {
  for (const key of keys) {
    // Invalidate Redis
    if (redisConfig.isAvailable()) {
      try {
        const redis = redisConfig.getClient();
        if (key.endsWith('*')) {
          const pattern = key;
          const matchingKeys = await redis.keys(pattern);
          if (matchingKeys.length > 0) {
            await redis.del(...matchingKeys);
          }
        } else {
          await redis.del(key);
        }
      } catch (err) {
        // Ignore
      }
    }

    // Invalidate memory store
    if (key.endsWith('*')) {
      const prefix = key.slice(0, -1);
      for (const storedKey of memoryStore.keys()) {
        if (storedKey.startsWith(prefix)) memoryStore.delete(storedKey);
      }
    } else {
      memoryStore.delete(key);
    }
  }
}

/**
 * Clear all cached items.
 */
async function clear() {
  if (redisConfig.isAvailable()) {
    try {
      const redis = redisConfig.getClient();
      await redis.flushdb();
    } catch (err) {
      // Ignore
    }
  }
  memoryStore.clear();
}

module.exports = { get, set, invalidate, clear };
