/**
 * Enhanced in-memory TTL cache with Express middleware support.
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
function set(key, value, ttlMs = 15000) {
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
 * Clear the entire cache.
 */
function clear() {
  store.clear();
}

/**
 * Express middleware for GET endpoints.
 * @param {number} ttlSeconds - Duration to cache in seconds
 */
function middleware(ttlSeconds = 15) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = `express:${req.originalUrl || req.url}`;
    const cachedBody = get(key);

    if (cachedBody) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      return res.json(cachedBody);
    }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        set(key, body, ttlSeconds * 1000);
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = { get, set, invalidate, clear, middleware };
