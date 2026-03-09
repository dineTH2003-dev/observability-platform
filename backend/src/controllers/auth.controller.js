const { signupUser, loginUser, generateResetToken } = require('../services/auth.service');
const { sendResetEmail } = require('../utils/email.util');

async function signup(req, res) {
  try {
    const user = await signupUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  signup,
  login,
  forgotPassword,
};

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