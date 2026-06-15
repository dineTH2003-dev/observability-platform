const nodemailer = require('nodemailer');
const env = require('../config/env');

function getTransporter() {
  if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
    throw new Error(
      'Email is not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS to enable password reset emails.',
    );
  }

  return nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: false,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

async function sendResetEmail(email, token) {
  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  const transporter = getTransporter();

  console.log("Sending email to:", email);
  console.log("Reset link:", resetLink);

  try {
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

    console.log("Email sent successfully");

  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
}

module.exports = {
  sendResetEmail,
};
