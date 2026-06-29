-- Dashboard time-window indexes for an existing database.
-- CONCURRENTLY keeps metric and anomaly writes available while each index builds.
-- Run this file outside a transaction.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_server_metrics_recorded_at
  ON server_metrics(recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomalies_detected_at
  ON anomalies(detected_at DESC);
