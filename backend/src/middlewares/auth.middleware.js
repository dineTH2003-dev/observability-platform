const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    req.user = {
      ...decoded,
      role: decoded.role ? decoded.role.toLowerCase() : 'engineer',
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function authorize(roles = []) {
  return (req, res, next) => {
    if (!roles.length) {
      return next();
    }

    const userRole = req.user?.role?.toLowerCase();
    if (!userRole || !roles.map((role) => role.toLowerCase()).includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};