const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = new Map();

function rateLimitPasswordChanges(req, res, next) {
  const key = req.user?.userId || req.ip;
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.expiresAt <= now) {
    attempts.set(key, {
      count: 1,
      expiresAt: now + WINDOW_MS,
    });
    return next();
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      message: "Too many password change attempts. Please try again later.",
    });
  }

  entry.count += 1;
  attempts.set(key, entry);
  return next();
}

module.exports = {
  rateLimitPasswordChanges,
};
