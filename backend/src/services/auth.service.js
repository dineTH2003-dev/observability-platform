const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const crypto = require('crypto');
// password validation lives on frontend; keep backend minimal here
const { sendVerificationEmail } = require('../utils/email.util');

const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function generateSecureToken() {
  return crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function signupUser({ email, password, role = 'engineer' }) {
  const hashed = await bcrypt.hash(password, 10);
  const verificationToken = generateSecureToken();
  const tokenHash = hashToken(verificationToken);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  const client = await db.connect();
  let user;

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO users (email, password_hash, role, email_verified)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, email, role, email_verified`,
      [email, hashed, role]
    );

    user = result.rows[0];

    await client.query(
      `INSERT INTO email_verifications (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      throw new Error('Email already registered');
    }
    throw err;
  } finally {
    client.release();
  }

  await sendVerificationEmail(user.email, verificationToken);

  return {
    message: 'Registration successful. Please check your email to verify your account.',
    user,
  };
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
    { userId: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
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

async function verifyEmail(token) {
  if (!token) throw new Error('Verification token is required');

  const tokenHash = hashToken(token);
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT ev.id, ev.user_id, ev.expires_at, u.email_verified
       FROM email_verifications ev
       JOIN users u ON u.id = ev.user_id
       WHERE ev.token_hash = $1
       FOR UPDATE`,
      [tokenHash]
    );

    const verification = result.rows[0];
    if (!verification) {
      throw new Error('This verification link is invalid or has expired.');
    }

    if (new Date() > verification.expires_at) {
      await client.query('DELETE FROM email_verifications WHERE id = $1', [verification.id]);
      throw new Error('This verification link is invalid or has expired.');
    }

    if (!verification.email_verified) {
      await client.query(
        `UPDATE users SET email_verified = TRUE WHERE id = $1`,
        [verification.user_id]
      );
    }

    await client.query('DELETE FROM email_verifications WHERE id = $1', [verification.id]);
    await client.query('COMMIT');

    return { message: 'Email verified successfully' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function resendVerification(email) {
  const genericMessage =
    'If the account exists and requires verification, a verification email has been sent.';

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return { message: genericMessage };

  const result = await db.query(
    `SELECT id, email, email_verified FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  const user = result.rows[0];
  if (!user || user.email_verified) {
    return { message: genericMessage };
  }

  const verificationToken = generateSecureToken();
  const tokenHash = hashToken(verificationToken);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await db.query(
    `DELETE FROM email_verifications WHERE user_id = $1`,
    [user.id]
  );

  await db.query(
    `INSERT INTO email_verifications (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  await sendVerificationEmail(user.email, verificationToken);

  return { message: genericMessage };
}

module.exports = {
    signupUser,
    loginUser,
    generateResetToken,
    verifyEmail,
    resendVerification,
};
