CREATE TYPE server_status_enum AS ENUM ('HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN');
CREATE TYPE agent_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
CREATE TYPE application_status_enum AS ENUM ('ACTIVE', 'WARNING', 'DOWN');
CREATE TYPE service_status_enum AS ENUM ('RUNNING', 'STOPPED', 'ERROR', 'UNKNOWN');

--Authentication

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'engineer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

-- ============================================================
--  INFRASTRUCTURE
-- ============================================================
-- servers
CREATE TABLE servers (
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

-- server_metrics
CREATE TABLE server_metrics (
    metric_id SERIAL PRIMARY KEY,
    server_id INT NOT NULL REFERENCES servers(server_id) ON DELETE CASCADE,
    cpu_usage NUMERIC(5, 2),
    memory_usage NUMERIC(5, 2),
    disk_usage NUMERIC(5, 2),
    -- % of root disk used; sent by agent every cycle
    thread_count INT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- applications
CREATE TABLE applications (
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

CREATE TABLE services (
    service_id SERIAL PRIMARY KEY,
    server_id INT NOT NULL REFERENCES servers(server_id) ON DELETE CASCADE,
    application_id INT REFERENCES applications(application_id) ON DELETE
    SET NULL,
        name VARCHAR(255) NOT NULL,
        service_identifier VARCHAR(255),
        -- systemd unit e.g. "nginx.service"
        command TEXT,
        -- full cmdline, capped at 500 chars
        process_id INT,
        -- current PID; NULL when STOPPED
        technology VARCHAR(100),
        -- Java, Node.js, Python, Nginx ...
        status service_status_enum NOT NULL DEFAULT 'UNKNOWN',
        discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (server_id, name) -- conflict target for upsert
);

CREATE TABLE service_metrics (
    metric_id SERIAL PRIMARY KEY,
    service_id INT NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
    cpu_usage NUMERIC(5, 2),
    memory_usage NUMERIC(5, 2),
    baseline_value NUMERIC(12, 4),
    -- reserved for future ML anomaly detection baseline
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  LOGGING
-- ============================================================
-- log_configs
CREATE TABLE log_configs (
    log_config_id SERIAL PRIMARY KEY,
    service_id INT NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
    log_path TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (service_id) -- one config per service; enables upsert
);

-- ============================================================
--  INDEXES
-- ============================================================
-- servers
CREATE INDEX idx_servers_status ON servers(server_status);
CREATE INDEX idx_servers_environment ON servers(environment);
CREATE INDEX idx_servers_agent ON servers(agent_status);

-- server_metrics  (DESC so "get latest for server X" is a fast index scan)
CREATE INDEX idx_server_metrics_server_ts ON server_metrics(server_id, recorded_at DESC);

-- applications
CREATE INDEX idx_applications_server ON applications(server_id);
CREATE INDEX idx_applications_status ON applications(application_status);

-- services
CREATE INDEX idx_services_server ON services(server_id);

-- discovery lookup
CREATE INDEX idx_services_application ON services(application_id);
CREATE INDEX idx_services_status ON services(status);

-- filter by RUNNING/STOPPED
-- service_metrics
CREATE INDEX idx_service_metrics_service_ts ON service_metrics(service_id, recorded_at DESC);-- ============================================================
--  INCIDENT MANAGEMENT TABLES
--  Run: sudo -u postgres psql -d observability_db -f database/incident_schema.sql
--  Safe to run: does NOT modify any existing tables
-- ============================================================

-- ENUMs for anomalies
CREATE TYPE anomaly_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE anomaly_status_enum   AS ENUM ('detected', 'assigned', 'acknowledged', 'resolved');

-- ENUMs for incidents
CREATE TYPE incident_status_enum   AS ENUM ('open', 'acknowledged', 'resolved');
CREATE TYPE incident_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');

-- ============================================================
--  1. anomalies
-- ============================================================
CREATE TABLE IF NOT EXISTS anomalies (
  anomaly_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id      INT  REFERENCES servers(server_id)           ON DELETE SET NULL,
  service_id     INT  REFERENCES services(service_id)         ON DELETE SET NULL,
  application_id INT  REFERENCES applications(application_id) ON DELETE SET NULL,
  anomaly_type   VARCHAR(50)          NOT NULL,   -- 'CPU', 'MEMORY', 'DISK', 'ERROR_RATE' …
  severity       anomaly_severity_enum NOT NULL DEFAULT 'medium',
  title          VARCHAR(255)         NOT NULL,
  description    TEXT,
  metric_value   NUMERIC(10, 4),                  -- e.g. 95.4  (the actual reading)
  threshold      NUMERIC(10, 4),                  -- e.g. 90.0  (the limit crossed)
  status         anomaly_status_enum  NOT NULL DEFAULT 'detected',
  incident_id    UUID,                            -- FK added after incidents table created
  detected_at    TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);

-- ============================================================
--  2. incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  incident_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_number SERIAL UNIQUE,          -- human-readable counter: 1, 2, 3 → shown as INC-1
  title           VARCHAR(255)          NOT NULL,
  description     TEXT,
  severity        incident_severity_enum NOT NULL DEFAULT 'medium',
  status          incident_status_enum   NOT NULL DEFAULT 'open',
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  3. Link anomalies → incidents (FK back-reference)
-- ============================================================
ALTER TABLE anomalies
  ADD CONSTRAINT fk_anomaly_incident
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE SET NULL;

-- ============================================================
--  4. incident_timeline  (append-only audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_timeline (
  timeline_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL = system / auto action
  event_type  VARCHAR(50) NOT NULL,
  -- 'created' | 'assigned' | 'acknowledged' | 'resolved' | 'comment'
  message     TEXT        NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  5. Indexes for fast queries
-- ============================================================
CREATE INDEX idx_anomalies_status      ON anomalies(status);
CREATE INDEX idx_anomalies_incident    ON anomalies(incident_id);
CREATE INDEX idx_anomalies_server      ON anomalies(server_id);
CREATE INDEX idx_incidents_status      ON incidents(status);
CREATE INDEX idx_incidents_assigned    ON incidents(assigned_to);
CREATE INDEX idx_timeline_incident_ts  ON incident_timeline(incident_id, occurred_at ASC);
