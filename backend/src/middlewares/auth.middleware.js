const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require("../config/db");

async function authenticate(req, res, next) {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    const result = await db.query(
      `SELECT id, email, role, is_active
       FROM users
       WHERE id = $1`,
      [decoded.userId],
    );

    const user = result.rows[0];
    if (!user || user.is_active === false) {
      return res.status(401).json({ message: "User account is no longer available" });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
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
