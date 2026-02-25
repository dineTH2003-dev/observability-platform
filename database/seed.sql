-- =========================
-- Insert Servers
-- =========================
INSERT INTO servers (
        hostname,
        ip_address,
        os,
        environment,
        server_status,
        agent_status,
        username,
        last_discovered_at
    )
VALUES (
        'prod-server-01',
        '192.168.1.10',
        'Ubuntu 22.04',
        'production',
        'ACTIVE',
        'RUNNING',
        'ubuntu',
        NOW()
    ),
    (
        'dev-server-01',
        '192.168.1.20',
        'Ubuntu 22.04',
        'development',
        'ACTIVE',
        'RUNNING',
        'ubuntu',
        NOW()
    );

-- =========================
-- Insert Applications
-- =========================
INSERT INTO applications (
        server_id,
        name,
        version,
        description,
        application_status,
        deployment_path
    )
VALUES (
        1,
        'Payment Service',
        '1.0.0',
        'Handles all payment processing and transactions',
        'ACTIVE',
        '/opt/payment-service'
    ),
    (
        1,
        'Auth Service',
        '1.2.3',
        'Responsible for authentication and JWT validation',
        'DEGRADED',
        '/opt/auth-service'
    ),
    (
        2,
        'Analytics Service',
        '0.9.0',
        'Processes metrics and anomaly detection',
        'ACTIVE',
        '/opt/analytics-service'
    );

-- =========================
-- Insert Server Metrics
-- =========================
INSERT INTO server_metrics (
        server_id,
        cpu_usage,
        memory_usage,
        thread_count,
        timestamp
    )
VALUES (1, 75.5, 60.2, 120, NOW()),
    (1, 82.3, 68.7, 140, NOW() - INTERVAL '5 minutes'),
    (2, 40.2, 35.8, 60, NOW());
    
-- =========================
-- Insert Analytics Summary
-- =========================
INSERT INTO analytics_summaries (
        application_id,
        avg_cpu,
        avg_memory,
        anomaly_rate
    )
VALUES (1, 78.9, 65.3, 0.05),
    (2, 60.2, 50.1, 0.02),
    (3, 35.4, 30.8, 0.01);