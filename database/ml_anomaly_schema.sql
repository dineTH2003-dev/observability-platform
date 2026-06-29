-- ============================================================
--  ML ANOMALY DETECTION EXTENSIONS
--  Run after database/schema.sql:
--    psql -d observability_db -f database/ml_anomaly_schema.sql
--
--  This file is additive. It stores model metadata, rollups,
--  anomaly explanations, operator feedback, and deployment context.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Older experiments used a different ml_models shape:
--   model_id INT, model_name, model_type, target_type, target_id, ...
-- The current worker needs UUID model IDs plus feature/threshold metadata.
-- Preserve the legacy rows before creating the current registry.
DO $$
DECLARE
  legacy_table_name TEXT := 'ml_models_legacy';
  legacy_pk_name TEXT := 'ml_models_legacy_pkey';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ml_models'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ml_models'
      AND column_name = 'entity_type'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = legacy_table_name
    ) THEN
      legacy_table_name := 'ml_models_legacy_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
      legacy_pk_name := legacy_table_name || '_pkey';
    END IF;

    EXECUTE format('ALTER TABLE ml_models RENAME TO %I', legacy_table_name);

    IF to_regclass('public.ml_models_pkey') IS NOT NULL THEN
      EXECUTE format('ALTER INDEX ml_models_pkey RENAME TO %I', legacy_pk_name);
    END IF;

    RAISE NOTICE 'Renamed legacy ml_models table to %', legacy_table_name;
  END IF;
END $$;

-- ============================================================
--  1. Model registry
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_ml_models_lookup
  ON ml_models(entity_type, entity_id, metric_group, status);

-- ============================================================
--  2. Rollup tables used by training and scoring
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_server_rollups_1m_ts
  ON server_metric_rollups_1m(server_id, window_start DESC);

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

CREATE INDEX IF NOT EXISTS idx_service_rollups_5m_ts
  ON service_metric_rollups_5m(service_id, window_start DESC);

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

CREATE INDEX IF NOT EXISTS idx_log_rollups_5m_ts
  ON log_metric_rollups_5m(service_id, window_start DESC);

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

-- ============================================================
--  3. ML details linked to the existing anomalies table
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_anomaly_ml_details_detector
  ON anomaly_ml_details(detector_name);

CREATE INDEX IF NOT EXISTS idx_anomaly_ml_details_window
  ON anomaly_ml_details(window_start DESC);

-- ============================================================
--  4. Operator feedback loop
-- ============================================================
CREATE TABLE IF NOT EXISTS anomaly_feedback (
  feedback_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anomaly_id     UUID NOT NULL REFERENCES anomalies(anomaly_id) ON DELETE CASCADE,
  label          VARCHAR(40) NOT NULL CHECK (label IN ('true_positive', 'false_positive', 'expected_change', 'duplicate', 'unknown')),
  comment        TEXT,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_feedback_anomaly
  ON anomaly_feedback(anomaly_id, created_at DESC);

-- ============================================================
--  5. Context used for suppression and lower-severity decisions
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_maintenance_windows_lookup
  ON maintenance_windows(entity_type, entity_id, starts_at, ends_at);

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

CREATE INDEX IF NOT EXISTS idx_deployment_events_lookup
  ON deployment_events(server_id, service_id, application_id, deployed_at DESC);

-- ============================================================
--  6. Worker watermarks
-- ============================================================
CREATE TABLE IF NOT EXISTS ml_watermarks (
  worker_name    VARCHAR(100) PRIMARY KEY,
  last_processed_at TIMESTAMPTZ NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
