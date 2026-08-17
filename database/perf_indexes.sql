-- Performance Optimization Composite Indexes for Observability Telemetry
-- CONCURRENTLY builds indexes without locking tables during write operations.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_server_metrics_server_recorded
  ON server_metrics(server_id, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_metrics_service_recorded
  ON service_metrics(service_id, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomalies_server_status_detected
  ON anomalies(server_id, status, detected_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomalies_status_detected
  ON anomalies(status, detected_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_status_created
  ON incidents(status, created_at DESC);
