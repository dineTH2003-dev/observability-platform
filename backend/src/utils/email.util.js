const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: false,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

async function sendResetEmail(email, token) {
  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"CloudSight" <${env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset',
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

module.exports = {
  sendResetEmail,
};