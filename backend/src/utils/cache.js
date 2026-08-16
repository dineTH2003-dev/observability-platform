/**
 * Lightweight in-memory TTL cache.
 *
 * Usage:
 *   const cache = require('./cache');
 *   const result = cache.get('my-key');
 *   if (!result) {
 *     const fresh = await expensiveQuery();
 *     cache.set('my-key', fresh, 15_000); // 15 second TTL
 *     return fresh;
 *   }
 *   return result;
 */

const store = new Map();

/**
 * Retrieve a cached value. Returns undefined if the key is missing or expired.
 * @param {string} key
 * @returns {any | undefined}
 */
function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Store a value with a TTL.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs - Time-to-live in milliseconds
 */
function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Invalidate one or more keys (e.g. after a write/mutation).
 * Accepts exact keys or key prefixes ending with '*'.
 * @param {...string} keys
 */
function invalidate(...keys) {
  for (const key of keys) {
    if (key.endsWith('*')) {
      const prefix = key.slice(0, -1);
      for (const storedKey of store.keys()) {
        if (storedKey.startsWith(prefix)) store.delete(storedKey);
      }
    } else {
      store.delete(key);
    }
  }
}

/**
 * Clear the entire cache (useful for tests).
 */
function clear() {
  store.clear();
}

module.exports = { get, set, invalidate, clear };
