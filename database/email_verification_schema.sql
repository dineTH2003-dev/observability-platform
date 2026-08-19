-- ============================================================
--  EMAIL VERIFICATION EXTENSIONS
--  Run after database/schema.sql:
--    psql -d observability_db -f database/email_verification_schema.sql
--
--  This migration is additive and keeps existing users verified.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users
      ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

    UPDATE users
      SET email_verified = TRUE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user
  ON email_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verifications_expires
  ON email_verifications(expires_at);
