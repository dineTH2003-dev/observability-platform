CREATE TYPE server_status_enum AS ENUM ('HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN');
CREATE TYPE agent_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
CREATE TYPE application_status_enum AS ENUM ('ACTIVE', 'WARNING', 'DOWN');

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