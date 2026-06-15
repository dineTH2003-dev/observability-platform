# ML Anomaly Worker

This worker implements the anomaly detection pipeline described in
`docs/anomaly-detection-ml-process.md`. It is designed to work in two modes:

- Historical/shadow mode while realtime ingestion is not complete.
- Scheduled scoring mode once the backend agent is sending fresh metrics.

The current detector strategy is hybrid: deterministic rules, stale telemetry
checks, rolling robust baselines, disk trend detection, and Isolation Forest
models for multivariate resource anomalies.

## Setup

```bash
cd ml
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Required environment variables use the same database settings as the backend:

```bash
export DB_USER=...
export DB_PASSWORD=...
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=observability_db
export BACKEND_API_URL=http://localhost:9000/api
export ML_INTERNAL_TOKEN=dev-secret
```

Run the additive schema once before using the worker:

```bash
psql -d observability_db -f ../database/ml_anomaly_schema.sql
```

## Readiness First

Before training or scoring, check the live database:

```bash
python -m app.jobs.readiness_report
```

Use JSON output for automation:

```bash
python -m app.jobs.readiness_report --json
```

The report checks metric freshness, table counts, rollup coverage, trainable
entities, registered models, and whether feedback is connected to ML-created
anomalies. If it reports no recent metrics, keep models in `shadow` and use
`--dry-run` scoring until ingestion is restored.

## Historical Workflow

Backfill rollups from existing raw metric rows:

```bash
python -m app.jobs.backfill_rollups --hours 720
```

Train shadow Isolation Forest models:

```bash
python -m app.jobs.train_models --entity-type server --days 30 --status shadow
python -m app.jobs.train_models --entity-type service --days 30 --status shadow
```

Score safely first. By default this also checks stale telemetry, so it is useful
even when no new rollup rows exist yet:

```bash
python -m app.jobs.score_realtime --minutes 180 --dry-run
```

If the dry-run output is acceptable and the backend is running, post anomalies:

```bash
python -m app.jobs.score_realtime --minutes 180
```

Evaluate operator feedback:

```bash
python -m app.jobs.evaluate_models --days 30
```

## Scheduled Workflow

For a simple MVP scheduler without adding queue infrastructure:

```bash
python -m app.jobs.run_worker --interval-seconds 60 --minutes 30
```

Dry-run scheduler:

```bash
python -m app.jobs.run_worker --interval-seconds 60 --minutes 30 --dry-run
```

Useful options:

```bash
python -m app.jobs.run_worker   --server-stale-minutes 10   --service-stale-minutes 15   --max-telemetry-entities 100
```

In production, run the worker through systemd or cron first. Add Redis/Kafka only
after metric volume or replay needs justify it.

## Safety Defaults

- Keep Isolation Forest models in `shadow` until there are 7 to 14 days of fresh continuous metrics.
- Stale telemetry detections use `auto_create_incident=false` by default while ingestion is incomplete.
- Shadow Isolation Forest detections never auto-create incidents.
- High/critical deterministic or baseline detections can create incidents through the backend policy.
- The backend deduplicates ML anomalies by fingerprint.

## Local Step-By-Step Runbook

1. Start or verify the backend.

```bash
cd backend
npm start
```

In another terminal:

```bash
curl http://localhost:9000/api/ml/health
```

2. Load the same database settings used by the backend.

```bash
cd ml
set -a
source ../backend/.env
set +a
export BACKEND_API_URL=http://localhost:9000/api
```

3. Check readiness.

```bash
python3 -m app.jobs.readiness_report
```

4. Backfill and train from historical data if needed.

```bash
python3 -m app.jobs.backfill_rollups --hours 720
python3 -m app.jobs.train_models --entity-type server --days 30 --status shadow
python3 -m app.jobs.train_models --entity-type service --days 30 --status shadow
```

5. Score safely.

```bash
python3 -m app.jobs.score_realtime --minutes 180 --dry-run
```

6. Start scheduled dry-run while ingestion is being finished.

```bash
python3 -m app.jobs.run_worker --interval-seconds 60 --minutes 180 --dry-run
```

7. Once fresh metrics are flowing and dry-run output is acceptable, run real scoring.

```bash
python3 -m app.jobs.run_worker --interval-seconds 60 --minutes 180
```

Keep models in `shadow` until there are 7 to 14 days of continuous recent metrics
and enough operator feedback to estimate false positives.
