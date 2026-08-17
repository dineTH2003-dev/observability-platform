-- Performance & Latency Reduction Composite Indexes

-- Server Metrics: Range queries by server and time window
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_server_metrics_server_time 
  ON server_metrics(server_id, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_server_metrics_recorded_at
  ON server_metrics(recorded_at DESC);

-- Service Metrics: Range queries by service and time window
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_metrics_service_time 
  ON service_metrics(service_id, recorded_at DESC);

-- Anomalies: Fast lookup by server, status, and detection timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomalies_server_status_time 
  ON anomalies(server_id, status, detected_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomalies_status_time 
  ON anomalies(status, detected_at DESC);

-- Incidents: Fast filtering for open/acknowledged incidents
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_status_created 
  ON incidents(status, created_at DESC);

-- Applications & Services: Foreign key lookup speedups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_server_id 
  ON applications(server_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_server_id 
  ON services(server_id);
