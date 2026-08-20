const {
  signupUser,
  loginUser,
  generateResetToken,
  verifyEmail: verifyEmailService,
  resendVerification: resendVerificationService,
} = require('../services/auth.service');
const { sendResetEmail } = require('../utils/email.util');
const bcrypt = require('bcrypt');
const db = require('../config/db');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

async function signup(req, res) {
  try {
    const user = await signupUser(req.body);
    if (user.token) {
      res.cookie('token', user.token, COOKIE_OPTIONS);
    }
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function login(req, res) {
  try {
    const authResult = await loginUser(req.body);
    if (authResult.token) {
      res.cookie('token', authResult.token, COOKIE_OPTIONS);
    }
    res.json(authResult);
  } catch (err) {
    const status = err.message === 'Please verify your email address before signing in.' ? 403 : 401;
    res.status(status).json({ message: err.message });
  }
}

async function logout(req, res) {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ message: 'Successfully logged out' });
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const token = await generateResetToken(email);
    await sendResetEmail(email, token);

    res.json({ message: 'Reset link sent to email' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    const result = await db.query(
      `SELECT * FROM password_resets WHERE token = $1`,
      [token]
    );

    const reset = result.rows[0];
    if (!reset) throw new Error('Invalid token');

    if (new Date() > reset.expires_at) {
      throw new Error('Token expired');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [hashed, reset.user_id]
    );

    // delete token after use
    await db.query(
      `DELETE FROM password_resets WHERE user_id = $1`,
      [reset.user_id]
    );

    res.json({ message: "Password reset successful" });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function verifyEmail(req, res) {
  try {
    const result = await verifyEmailService(req.query.token);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function resendVerification(req, res) {
  try {
    const result = await resendVerificationService(req.body.email);
    res.json(result);
  } catch (_err) {
    res.json({
      message: 'If the account exists and requires verification, a verification email has been sent.',
    });
  }
}

module.exports = {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
