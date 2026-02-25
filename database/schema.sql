-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =========================
-- SERVER
-- =========================
CREATE TABLE servers (
    server_id BIGSERIAL PRIMARY KEY,
    hostname VARCHAR(150) NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    os VARCHAR(100),
    environment VARCHAR(50),
    server_status VARCHAR(50),
    agent_status VARCHAR(50),
    username VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_discovered_at TIMESTAMP
);
-- =========================
-- SERVER METRICS
-- =========================
CREATE TABLE server_metrics (
    metric_id BIGSERIAL PRIMARY KEY,
    server_id BIGINT REFERENCES servers(server_id) ON DELETE CASCADE,
    cpu_usage FLOAT,
    memory_usage FLOAT,
    thread_count INT,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
-- =========================
-- APPLICATION
-- =========================
CREATE TABLE applications (
    application_id BIGSERIAL PRIMARY KEY,
    server_id BIGINT REFERENCES servers(server_id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    version VARCHAR(50),
    description TEXT,
    application_status VARCHAR(50) CHECK (
        application_status IN ('ACTIVE', 'DOWN', 'WARNING', 'MAINTENANCE')
    ) DEFAULT 'ACTIVE',
    deployment_path TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- =========================
-- ANALYTICS SUMMARY
-- =========================
CREATE TABLE analytics_summaries (
    summary_id BIGSERIAL PRIMARY KEY,
    application_id BIGINT UNIQUE REFERENCES applications(application_id) ON DELETE CASCADE,
    avg_cpu FLOAT,
    avg_memory FLOAT,
    anomaly_rate FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE INDEX idx_server_metrics_server_id ON server_metrics(server_id);
CREATE INDEX idx_server_metrics_timestamp ON server_metrics(timestamp);
CREATE INDEX idx_applications_server_id ON applications(server_id);