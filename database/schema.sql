-- ==============================================================================
--  AI-POWERED OBSERVABILITY PLATFORM - CANONICAL DATABASE SCHEMA
--  Database Engine: PostgreSQL (14+) with TimescaleDB extensions
--  File: database/schema.sql
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS & ENUM TYPES
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Infrastructure & Agent Enums
DO $$ BEGIN
  CREATE TYPE server_status_enum AS ENUM ('HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE agent_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status_enum AS ENUM ('ACTIVE', 'WARNING', 'DOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE service_status_enum AS ENUM ('RUNNING', 'STOPPED', 'ERROR', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Support Ticket Enums
DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('Open', 'In Progress', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_purpose AS ENUM (
    'Alert Configuration Request',
    'Service / Application Management',
    'Access / Permission Request',
    'Incident Follow-up',
    'General Inquiry'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Anomaly & Incident Enums
DO $$ BEGIN
  CREATE TYPE anomaly_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE anomaly_status_enum AS ENUM ('detected', 'assigned', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status_enum AS ENUM ('open', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- 2. USER AUTHENTICATION & SECURITY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'engineer',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

-- ==============================================================================
-- 3. INFRASTRUCTURE MONITORING (SERVERS, METRICS, APPS, SERVICES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS servers (
  server_id SERIAL PRIMARY KEY,
  hostname VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  os VARCHAR(100),
  environment VARCHAR(100),
  server_status server_status_enum NOT NULL DEFAULT 'UNKNOWN',
  agent_status agent_status_enum NOT NULL DEFAULT 'INACTIVE',
  username VARCHAR(150),
  ssh_port INT NOT NULL DEFAULT 22,
  last_discovered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS server_metrics (
  metric_id SERIAL PRIMARY KEY,
  server_id INT NOT NULL REFERENCES servers(server_id) ON DELETE CASCADE,
  cpu_usage NUMERIC(5, 2),
  memory_usage NUMERIC(5, 2),
  disk_usage NUMERIC(5, 2),
  thread_count INT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  application_id SERIAL PRIMARY KEY,
  server_id INT NOT NULL REFERENCES servers(server_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50),
  description TEXT,
  deployment_path TEXT,
  application_status application_status_enum NOT NULL DEFAULT 'ACTIVE',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  service_id SERIAL PRIMARY KEY,
  server_id INT NOT NULL REFERENCES servers(server_id) ON DELETE CASCADE,
  application_id INT REFERENCES applications(application_id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  service_identifier VARCHAR(255),
  command TEXT,
  process_id INT,
  technology VARCHAR(100),
  status service_status_enum NOT NULL DEFAULT 'UNKNOWN',
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (server_id, name)
);

CREATE TABLE IF NOT EXISTS service_metrics (
  metric_id SERIAL PRIMARY KEY,
  service_id INT NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
  cpu_usage NUMERIC(5, 2),
  memory_usage NUMERIC(5, 2),
  disk_usage NUMERIC(5, 2) DEFAULT 0,
  thread_count INT DEFAULT 0,
  baseline_value NUMERIC(12, 4),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. LOG SCRAPING & MANAGEMENT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS log_configs (
  log_config_id SERIAL PRIMARY KEY,
  service_id INT NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
  log_path TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id)
);

CREATE TABLE IF NOT EXISTS log_entries (
  log_entry_id SERIAL PRIMARY KEY,
  log_config_id INT NOT NULL REFERENCES log_configs(log_config_id) ON DELETE CASCADE,
  raw_line TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  log_level VARCHAR(20) NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS log_analytics (
  log_analytics_id SERIAL PRIMARY KEY,
  log_entry_id INT NOT NULL UNIQUE REFERENCES log_entries(log_entry_id) ON DELETE CASCADE,
  info_count INT NOT NULL DEFAULT 0,
  warn_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  fatal_count INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. ALERTS & ALERT SETTINGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  condition TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  duration INT DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope VARCHAR(50) DEFAULT 'all',
  cooldown INT DEFAULT 0,
  send_once BOOLEAN NOT NULL DEFAULT FALSE,
  threshold NUMERIC(10, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_rule_evaluations (
  id SERIAL PRIMARY KEY,
  rule_id VARCHAR(50) REFERENCES alerts(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  last_triggered_at TIMESTAMPTZ,
  UNIQUE(rule_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS alert_settings (
  id INT PRIMARY KEY DEFAULT 1,
  alert_events JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipients JSONB NOT NULL DEFAULT '{}'::jsonb,
  email_channel_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  email_address VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO alert_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 6. SUPPORT TICKETS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(20) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  purpose ticket_purpose NOT NULL,
  context VARCHAR(100),
  requester_id UUID REFERENCES users(id),
  priority ticket_priority DEFAULT 'medium',
  status ticket_status DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. ANOMALY DETECTION & INCIDENT MANAGEMENT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS incidents (
  incident_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_number SERIAL UNIQUE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  severity        incident_severity_enum NOT NULL DEFAULT 'medium',
  status          incident_status_enum NOT NULL DEFAULT 'open',
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anomalies (
  anomaly_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id      INT REFERENCES servers(server_id) ON DELETE SET NULL,
  service_id     INT REFERENCES services(service_id) ON DELETE SET NULL,
  application_id INT REFERENCES applications(application_id) ON DELETE SET NULL,
  anomaly_type   VARCHAR(50) NOT NULL,
  severity       anomaly_severity_enum NOT NULL DEFAULT 'medium',
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  metric_value   NUMERIC(10, 4),
  threshold      NUMERIC(10, 4),
  status         anomaly_status_enum NOT NULL DEFAULT 'detected',
  incident_id    UUID REFERENCES incidents(incident_id) ON DELETE SET NULL,
  detected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS incident_timeline (
  timeline_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type  VARCHAR(50) NOT NULL,
  message     TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES incidents(incident_id) ON DELETE SET NULL,
  anomaly_id UUID REFERENCES anomalies(anomaly_id) ON DELETE SET NULL,
  ticket_id VARCHAR(20),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- ==============================================================================
-- 8. MACHINE LEARNING ENGINE SCHEMA EXTENSIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ml_models (
  model_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     VARCHAR(30) NOT NULL CHECK (entity_type IN ('server', 'service', 'application', 'global')),
  entity_id       INT,
  metric_group    VARCHAR(80) NOT NULL,
  algorithm       VARCHAR(80) NOT NULL,
  feature_schema  JSONB NOT NULL DEFAULT '[]'::JSONB,
  parameters      JSONB NOT NULL DEFAULT '{}'::JSONB,
  thresholds      JSONB NOT NULL DEFAULT '{}'::JSONB,
  artifact_uri    TEXT,
  training_start  TIMESTAMPTZ,
  training_end    TIMESTAMPTZ,
  status          VARCHAR(30) NOT NULL DEFAULT 'shadow' CHECK (status IN ('shadow', 'active', 'retired', 'failed')),
  metrics         JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS server_metric_rollups_1m (
  server_id            INT NOT NULL REFERENCES servers(server_id) ON DELETE CASCADE,
  window_start         TIMESTAMPTZ NOT NULL,
  window_end           TIMESTAMPTZ NOT NULL,
  sample_count         INT NOT NULL DEFAULT 0,
  missing_count        INT NOT NULL DEFAULT 0,
  cpu_min              NUMERIC(10, 4),
  cpu_max              NUMERIC(10, 4),
  cpu_avg              NUMERIC(10, 4),
  cpu_last             NUMERIC(10, 4),
  memory_min           NUMERIC(10, 4),
  memory_max           NUMERIC(10, 4),
  memory_avg           NUMERIC(10, 4),
  memory_last          NUMERIC(10, 4),
  disk_min             NUMERIC(10, 4),
  disk_max             NUMERIC(10, 4),
  disk_avg             NUMERIC(10, 4),
  disk_last            NUMERIC(10, 4),
  thread_count_min     INT,
  thread_count_max     INT,
  thread_count_avg     NUMERIC(12, 4),
  thread_count_last    INT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (server_id, window_start)
);

CREATE TABLE IF NOT EXISTS service_metric_rollups_5m (
  service_id       INT NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
  window_start     TIMESTAMPTZ NOT NULL,
  window_end       TIMESTAMPTZ NOT NULL,
  sample_count     INT NOT NULL DEFAULT 0,
  missing_count    INT NOT NULL DEFAULT 0,
  cpu_min          NUMERIC(10, 4),
  cpu_max          NUMERIC(10, 4),
  cpu_avg          NUMERIC(10, 4),
  cpu_last         NUMERIC(10, 4),
  memory_min       NUMERIC(10, 4),
  memory_max       NUMERIC(10, 4),
  memory_avg       NUMERIC(10, 4),
  memory_last      NUMERIC(10, 4),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (service_id, window_start)
);

CREATE TABLE IF NOT EXISTS log_metric_rollups_5m (
  service_id       INT NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
  window_start     TIMESTAMPTZ NOT NULL,
  window_end       TIMESTAMPTZ NOT NULL,
  total_count      INT NOT NULL DEFAULT 0,
  error_count      INT NOT NULL DEFAULT 0,
  warning_count    INT NOT NULL DEFAULT 0,
  info_count       INT NOT NULL DEFAULT 0,
  debug_count      INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (service_id, window_start)
);

CREATE TABLE IF NOT EXISTS metric_baselines (
  entity_type      VARCHAR(30) NOT NULL,
  entity_id        INT NOT NULL,
  metric_name      VARCHAR(50) NOT NULL,
  window_start     TIMESTAMPTZ NOT NULL,
  baseline         NUMERIC(12, 4),
  lower_bound      NUMERIC(12, 4),
  upper_bound      NUMERIC(12, 4),
  PRIMARY KEY (entity_type, entity_id, metric_name, window_start)
);

CREATE TABLE IF NOT EXISTS anomaly_ml_details (
  anomaly_id       UUID PRIMARY KEY REFERENCES anomalies(anomaly_id) ON DELETE CASCADE,
  model_id         UUID REFERENCES ml_models(model_id) ON DELETE SET NULL,
  entity_type      VARCHAR(30) NOT NULL CHECK (entity_type IN ('server', 'service', 'application')),
  detector_name    VARCHAR(80) NOT NULL,
  score            NUMERIC(10, 6),
  confidence       NUMERIC(10, 6),
  window_start     TIMESTAMPTZ,
  window_end       TIMESTAMPTZ,
  expected_value   NUMERIC(12, 4),
  lower_bound      NUMERIC(12, 4),
  upper_bound      NUMERIC(12, 4),
  feature_values   JSONB NOT NULL DEFAULT '{}'::JSONB,
  reason_codes     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  fingerprint      TEXT NOT NULL UNIQUE,
  suppression_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anomaly_feedback (
  feedback_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anomaly_id     UUID NOT NULL REFERENCES anomalies(anomaly_id) ON DELETE CASCADE,
  label          VARCHAR(40) NOT NULL CHECK (label IN ('true_positive', 'false_positive', 'expected_change', 'duplicate', 'unknown')),
  comment        TEXT,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_windows (
  maintenance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type    VARCHAR(30) NOT NULL CHECK (entity_type IN ('server', 'service', 'application', 'global')),
  entity_id      INT,
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL,
  reason         TEXT,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS deployment_events (
  deployment_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id INT REFERENCES applications(application_id) ON DELETE SET NULL,
  service_id     INT REFERENCES services(service_id) ON DELETE SET NULL,
  server_id      INT REFERENCES servers(server_id) ON DELETE SET NULL,
  version        VARCHAR(100),
  description    TEXT,
  deployed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ml_watermarks (
  worker_name    VARCHAR(100) PRIMARY KEY,
  last_processed_at TIMESTAMPTZ NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. REPORT EXPORTS SCHEMA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS report_exports (
  id          SERIAL PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,
  scope       VARCHAR(50) NOT NULL DEFAULT 'Global',
  scope_id    TEXT,
  time_range  TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  exported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 10. COMPOSITE PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(server_status);
CREATE INDEX IF NOT EXISTS idx_servers_environment ON servers(environment);
CREATE INDEX IF NOT EXISTS idx_servers_agent ON servers(agent_status);

CREATE INDEX IF NOT EXISTS idx_server_metrics_server_ts ON server_metrics(server_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_metrics_recorded_at ON server_metrics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_server ON applications(server_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(application_status);

CREATE INDEX IF NOT EXISTS idx_services_server ON services(server_id);
CREATE INDEX IF NOT EXISTS idx_services_application ON services(application_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

CREATE INDEX IF NOT EXISTS idx_service_metrics_service_ts ON service_metrics(service_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_metrics_service_recorded ON service_metrics(service_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_incident ON anomalies(incident_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_server ON anomalies(server_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected_at ON anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_server_status_detected ON anomalies(server_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_status_detected ON anomalies(status, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned ON incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incidents_status_created ON incidents(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_incident_ts ON incident_timeline(incident_id, occurred_at ASC);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(recipient_user_id, is_read) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_email_anomaly ON notifications(anomaly_id, recipient_user_id, notification_type, email_sent) WHERE email_sent = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_email_incident ON notifications(incident_id, recipient_user_id, notification_type, email_sent) WHERE email_sent = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ml_models_lookup ON ml_models(entity_type, entity_id, metric_group, status);
CREATE INDEX IF NOT EXISTS idx_server_rollups_1m_ts ON server_metric_rollups_1m(server_id, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_service_rollups_5m_ts ON service_metric_rollups_5m(service_id, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_log_rollups_5m_ts ON log_metric_rollups_5m(service_id, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_ml_details_detector ON anomaly_ml_details(detector_name);
CREATE INDEX IF NOT EXISTS idx_anomaly_ml_details_window ON anomaly_ml_details(window_start DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_feedback_anomaly ON anomaly_feedback(anomaly_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_lookup ON maintenance_windows(entity_type, entity_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_deployment_events_lookup ON deployment_events(server_id, service_id, application_id, deployed_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_exports_exported_by ON report_exports(exported_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_exports_created_at ON report_exports(created_at DESC);
