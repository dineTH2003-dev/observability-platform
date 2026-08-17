Release: Email Verification for Signup

- New users must verify their email before account activation. After signing up, users receive a verification email and must click the link to activate their account.
- Verification tokens are generated securely, stored as a hash in the database, and expire after a configurable TTL.
- Users can resend verification emails using the "Resend Verification Email" action on the verification-pending page.
- Existing forgot-password email functionality continues to work and uses the same Nodemailer configuration (single transporter).
