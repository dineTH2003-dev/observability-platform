-- Migration: Create report_exports table
-- Description: Stores history of exported PDF reports for later retrieval and re-download
-- Date: 2026-08-18

CREATE TABLE IF NOT EXISTS report_exports (
  id          SERIAL PRIMARY KEY,
  report_type VARCHAR(50)  NOT NULL,
  scope       VARCHAR(50)  NOT NULL DEFAULT 'Global',
  scope_id    TEXT,
  time_range  TEXT         NOT NULL,
  file_name   TEXT         NOT NULL,
  file_path   TEXT         NOT NULL,
  exported_by UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for listing a user's exports (newest first)
CREATE INDEX IF NOT EXISTS idx_report_exports_exported_by
  ON report_exports(exported_by, created_at DESC);

-- Index for general listing (admin overview, newest first)
CREATE INDEX IF NOT EXISTS idx_report_exports_created_at
  ON report_exports(created_at DESC);
