-- ============================================================
--  ONE-TIME MIGRATION: Add columns to service_metrics
--  Run once: psql -d observability_db -f database/add_service_metric_columns.sql
--  Safe to re-run (uses IF NOT EXISTS).
-- ============================================================

ALTER TABLE service_metrics
  ADD COLUMN IF NOT EXISTS disk_usage   NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thread_count INT           DEFAULT 0;
