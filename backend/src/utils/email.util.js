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

async function sendVerificationEmail(email, token) {
  const frontendUrl = env.FRONTEND_URL.trim().replace(/\/$/, '');
  const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"CloudSight" <${env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your CloudSight email address',
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <h2 style="color: #4f46e5;">Welcome to CloudSight!</h2>
        <p>Thank you for creating your CloudSight account.</p>
        <p>Please verify your email address by clicking the button below.</p>
        <p style="margin: 28px 0;">
          <a href="${verificationLink}" style="background: #6d28d9; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">
            Verify Email
          </a>
        </p>
        <p>This verification link will expire in 24 hours.</p>
        <p>If you did not create this account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

async function sendNotificationEmail(to, subject, htmlContent) {
  try {
    await transporter.sendMail({
      from: `"CloudSight Alerts" <${env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
  } catch (err) {
    console.error('Error sending notification email:', err.message);
  }
}

module.exports = {
  sendResetEmail,
  sendVerificationEmail,
  sendNotificationEmail,
};
