const cache = require('../utils/cache');

/**
 * Route level caching middleware for Express routes.
 * Serves cached JSON response instantly with X-Cache headers.
 * 
 * @param {number} ttlSeconds - Cache TTL in seconds (default 15s)
 * @param {function} [keyGenerator] - Custom key generator (req) => string
 */
function cacheMiddleware(ttlSeconds = 15, keyGenerator = null) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = keyGenerator
      ? keyGenerator(req)
      : `route:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await cache.get(key);
      if (cachedResponse !== undefined && cachedResponse !== null) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
        return res.json(cachedResponse);
      }
    } catch (err) {
      // Continue to handler on cache read error
    }

    // Capture res.json payload to save into cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttlSeconds * 1000).catch(() => {});
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

module.exports = cacheMiddleware;
