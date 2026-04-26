const { signupUser, loginUser, generateResetToken } = require('../services/auth.service');
const { sendResetEmail } = require('../utils/email.util');
const bcrypt = require('bcrypt');
const db = require('../config/db');

async function signup(req, res) {
  try {
    const user = await signupUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function login(req, res) {
  try {
    const tokens = await loginUser(req.body);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
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

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
};