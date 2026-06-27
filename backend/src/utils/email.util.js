const nodemailer = require('nodemailer');
const env = require('../config/env');

const emailPort = Number(env.EMAIL_PORT);
const useSecure = emailPort === 465;

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: emailPort,
  secure: useSecure,
  requireTLS: !useSecure,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

transporter.verify(function (error) {
  if (error) {
    console.error('SMTP VERIFY ERROR:', error);
  } else {
    console.log('SMTP READY');
  }
});

async function sendResetEmail(email, token) {
  const frontendUrl = env.FRONTEND_URL.trim().replace(/\/$/, '');
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

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
