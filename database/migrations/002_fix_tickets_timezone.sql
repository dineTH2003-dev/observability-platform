-- Migration: Fix tickets created_at and updated_at to use TIMESTAMPTZ
-- This ensures timezone information is preserved

-- Alter the tickets table to use TIMESTAMPTZ
ALTER TABLE tickets
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at SET DEFAULT NOW();
