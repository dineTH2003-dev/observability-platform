const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const crypto = require('crypto');

async function signupUser({ email, password, role = 'USER' }) {
  const hashed = await bcrypt.hash(password, 10);

  const result = await db.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role`,
    [email, hashed, role]
  );

  return result.rows[0];
}

async function loginUser({ email, password }) {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];
  if (!user) throw new Error('Invalid credentials');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error('Invalid credentials');

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
}

async function generateResetToken(email) {
  const result = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];
  if (!user) throw new Error('User not found');

  // generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // expiry (1 hour)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  // save token in DB
  await db.query(
    `INSERT INTO password_resets (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, token, expiresAt]
  );

  return token;
}

module.exports = {
  signupUser,
  loginUser,
  generateResetToken,
};