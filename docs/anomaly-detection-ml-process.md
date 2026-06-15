# Anomaly Detection ML Process Plan

Last updated: 2026-05-18

This document plans the anomaly detection process for this observability platform. It is grounded in the current repository:

- PostgreSQL schema: `database/schema.sql`
- Agent collector: `backend/static/agent/agent.py`
- Service discovery: `backend/static/agent/discovery.py`
- Ingestion API: `backend/src/controllers/agent.controller.js`
- Ingestion service: `backend/src/services/agent.service.js`
- Current anomaly and incident models: `backend/src/models/anomaly.model.js`, `backend/src/services/incident.service.js`
- Current anomaly UI: `frontend/src/app/pages/anomalies/Anomalies.tsx`
- ML schema extension: `database/ml_anomaly_schema.sql`
- ML worker: `ml/app/jobs/backfill_rollups.py`, `ml/app/jobs/train_models.py`, `ml/app/jobs/score_realtime.py`
- Backend ML/anomaly routes: `backend/src/routes/ml.routes.js`, `backend/src/routes/anomaly.routes.js`

The main recommendation is a hybrid ML system: deterministic safety rules, robust rolling baselines, and Isolation Forest based multivariate scoring. This gives fast value with the data already collected, stays explainable enough for incident workflows, and can evolve later into forecasting or deep learning only after the platform has enough labels, retention, and operational feedback.

## 0. Database Readiness Check: 2026-05-18

The live PostgreSQL database was checked on 2026-05-18 before running the ML worker.

Current raw data:

| Table | Rows | Entity coverage | First seen | Last seen |
| --- | ---: | ---: | --- | --- |
| `server_metrics` | 48,909 | 1 server | 2026-04-17 00:00:00 +05:30 | 2026-05-18 12:59:36 +05:30 |
| `service_metrics` | 73,560 | 6 services | 2026-04-17 00:00:00 +05:30 | 2026-05-18 12:58:06 +05:30 |
| `anomalies` | 2 | existing anomaly events | 2026-04-24 16:08:02 +05:30 | 2026-04-24 16:08:02 +05:30 |

Training readiness:

| Window | Server readiness | Service readiness |
| --- | --- | --- |
| Last 14 days | Server 2 has 567 approximate 1-minute windows, so it is trainable by the current `ML_MIN_TRAINING_ROWS=500` setting. | Each service has only 117 approximate 5-minute windows, so services are not trainable on 14 days. |
| Last 30 days | Server 2 has more than 22,000 1-minute windows. | All 6 services have about 4,454 5-minute windows each. |

Conclusion: the database now has enough data to train the first Isolation Forest models when using a 30-day training window. It does not have enough continuous recent service data for a clean 14-day service model because collection has gaps: 2026-05-05 through 2026-05-08 and 2026-05-10 through 2026-05-17 have zero metric rows. Because of those gaps, the first trained models must stay in `shadow` mode until more continuous data and operator feedback are collected.

Actions completed on 2026-05-18:

- Preserved the older incompatible `ml_models` table by renaming it to `ml_models_legacy`.
- Applied `database/ml_anomaly_schema.sql`, creating the current `ml_models`, rollup, ML detail, feedback, maintenance, deployment, and watermark tables.
- Backfilled 30 days of rollups:
  - `server_metric_rollups_1m`: 22,229 rows
  - `service_metric_rollups_5m`: 26,718 rows
- Trained new shadow Isolation Forest models:
  - 1 server model for server 2, with 22,228 training rows
  - 6 service models, each with 4,452 training rows
- Ran `score_realtime --dry-run`; it completed successfully and did not generate any detections for the latest 180-minute scoring window.

Immediate next operator steps:

1. Keep the models in `shadow` status for now.
2. Run `backfill_rollups` every minute or every few minutes while metrics are being collected.
3. Run `score_realtime --dry-run` first after starting the backend, then run without `--dry-run` only when ready to create anomaly rows.
4. Collect continuous metrics for at least 7 to 14 days and add feedback labels through the anomaly UI.
5. Promote models from `shadow` to `active` only after reviewing false positives and confirming the backend anomaly creation path.

## 1. Current Data In The Platform

### 1.1 Server metric data

Current table: `server_metrics`

Fields:

- `server_id`: server identity
- `cpu_usage`: server CPU percent
- `memory_usage`: server memory percent
- `disk_usage`: root disk used percent
- `thread_count`: total process thread count on the server
- `recorded_at`: backend insertion timestamp

Current collection cadence:

- The Python agent sends server metrics every 30 seconds by default.
- The backend writes each sample directly into `server_metrics`.
- The backend also derives a static `server_status` from CPU, memory, and disk thresholds.

### 1.2 Service metric data

Current table: `service_metrics`

Fields:

- `service_id`: service identity
- `cpu_usage`: service CPU percent from process discovery
- `memory_usage`: service memory percent from process discovery
- `baseline_value`: currently reserved for future ML use
- `recorded_at`: backend insertion timestamp

Current collection cadence:

- Service discovery runs every 120 seconds by default.
- The discovery code detects system services and port-bound microservices.
- The backend upserts services and inserts CPU/memory samples for discovered services.

### 1.3 Entity context

Useful context tables:

- `servers`: hostname, IP, OS, environment, server status, agent status, heartbeat time
- `services`: service name, server, application, PID, technology, status
- `applications`: application-to-server ownership
- `anomalies`: current anomaly event table
- `incidents`: incident lifecycle table
- `incident_timeline`: audit trail for incident actions

### 1.4 Existing gaps

The current data is enough for host/service resource anomaly detection with a 30-day window. It is not yet enough for complete service health anomaly detection because these metrics are missing:

- Request rate, error rate, latency p50/p95/p99
- Restart count, exit code, crash loop count
- Network receive/transmit bytes and packet errors
- Disk read/write I/O and filesystem inode usage
- Load average and process count
- Deployment events and maintenance windows
- Human feedback labels on whether each anomaly was true positive or false positive

The storage for model metadata, anomaly scores, thresholds, and feedback now exists. The feedback table is still empty, so quality measurement is not possible yet. These gaps should be handled in the roadmap, but they do not block the first shadow-mode ML version.

## 2. What Counts As A Real Anomaly

A real anomaly is not just "a high value." It is a behavior that is unusual for the entity, time context, and operational state, and is likely to require investigation.

Use these categories:

- Point anomaly: one value is extremely unusual, for example CPU jumps from normal 15 percent to 98 percent.
- Sustained anomaly: values stay abnormal for a duration, for example memory remains above the normal band for 15 minutes.
- Trend anomaly: a metric is moving toward failure, for example disk grows quickly and will reach 95 percent soon.
- Multivariate anomaly: individual metrics look acceptable, but the combination is unusual, for example high thread count plus high memory on a service that normally has low CPU.
- Missing telemetry anomaly: the agent or service stops sending data.
- State anomaly: service status changes from `RUNNING` to `STOPPED` unexpectedly.
- Fleet anomaly: many related services or hosts become abnormal together.

Do not create incidents for every unusual point. Confirm using persistence, severity, deduplication, and known-event suppression.

## 3. Recommended Architecture

### 3.1 MVP architecture

Use a separate Python ML worker beside the Node/Express backend.

Flow:

```text
OneAgent
  -> POST /api/agent/metrics and /api/agent/services
  -> Node backend validation
  -> PostgreSQL raw metric tables
  -> rollup job creates 1m/5m windows
  -> Python ML trainer builds model artifacts
  -> Python ML scorer reads recent windows
  -> backend anomaly endpoint deduplicates and creates anomaly/incident
  -> frontend anomalies/incidents/notifications
```

Why a separate worker:

- Node stays responsible for APIs, auth, and incident business logic.
- Python is better for `pandas`, `scikit-learn`, model serialization, and feature engineering.
- The worker can run on a schedule first and later move to stream processing.

### 3.2 Production architecture

After the MVP works, add a queue between ingestion and ML scoring.

Recommended production flow:

```text
Agent -> Backend -> PostgreSQL raw tables
                 -> queue event "metric_received"
                 -> ML scorer consumes events
                 -> Backend internal anomaly API
                 -> Incident and notification workflow
```

Queue options:

- Redis Streams or BullMQ: simpler for this project.
- Kafka: better if metric volume becomes very large or multiple consumers need replay.

The MVP can poll PostgreSQL every minute. Do not add Kafka until the platform actually needs it.

## 4. Data Injection Controls

Metric ingestion should protect the ML pipeline from bad data.

### 4.1 Validation rules

Server metrics:

- `cpu_usage`, `memory_usage`, `disk_usage`: numeric, 0 to 100
- `thread_count`: integer, greater than or equal to 0
- `server_id`: must exist

Service metrics:

- `cpu_usage`, `memory_usage`: numeric, normally 0 to 100 per process group, but allow higher CPU only if process CPU semantics are later changed to multi-core percent
- `service_id`: must exist
- `status`: use service status as a feature and as a rule input

### 4.2 Timestamp rules

Current tables use `recorded_at` at insertion time. That is acceptable for MVP. For production, add:

- `collected_at`: timestamp from the agent when the measurement was taken
- `received_at`: timestamp from backend when the sample arrived

Use `collected_at` for ML windows and `received_at` for ingestion latency monitoring.

### 4.3 Resampling

Use raw samples for audit, but score on stable windows:

- Server metrics: raw 30s -> 1 minute rollup
- Service metrics: raw 120s -> 2 minute or 5 minute rollup
- Incident scoring: use 5 minute and 15 minute features to reduce noise

Rollup fields:

- count, min, max, mean, median
- p95 where enough points exist
- last value
- missing sample count

### 4.4 Idempotency and duplicates

Create a deterministic anomaly fingerprint:

```text
entity_type + entity_id + metric_name + detector_name + rounded_window_start
```

Before creating a new anomaly, check whether the same fingerprint is already open or recently created. This prevents duplicate incidents.

### 4.5 Missing data

Missing data must be treated separately from normal low usage.

Rules:

- If a server misses heartbeat for more than 10 minutes, the existing backend marks the agent inactive.
- If metrics are missing for 3 expected intervals, create a low/medium telemetry anomaly.
- If metrics are missing for a production server or critical service for more than 10 minutes, escalate severity.

## 5. Storage Changes Needed

The current `anomalies` table can store basic events, but production ML needs more metadata.

### 5.1 Add model registry

Suggested table: `ml_models`

Fields:

- `model_id UUID PRIMARY KEY`
- `entity_type`: `server`, `service`, `application`, or `global`
- `entity_id`: nullable for global models
- `metric_group`: `server_resource`, `service_resource`, etc.
- `algorithm`: `rolling_baseline`, `isolation_forest`, `forecast_residual`
- `feature_schema JSONB`
- `parameters JSONB`
- `thresholds JSONB`
- `artifact_uri TEXT`
- `training_start TIMESTAMPTZ`
- `training_end TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`
- `status`: `shadow`, `active`, `retired`, `failed`

### 5.2 Add rollup tables

Suggested tables:

- `server_metric_rollups_1m`
- `service_metric_rollups_5m`

Fields:

- entity id
- window start and end
- metric rollups
- sample count
- missing count
- created at

Add unique keys on `(entity_id, window_start)`.

### 5.3 Extend anomalies

Current fields are good for UI display, but add ML explainability:

- `model_id`
- `detector_name`
- `score`
- `confidence`
- `window_start`
- `window_end`
- `expected_value`
- `lower_bound`
- `upper_bound`
- `feature_values JSONB`
- `reason_codes TEXT[]`
- `fingerprint`
- `suppression_reason`

If changing the existing table is risky, create `anomaly_ml_details` linked by `anomaly_id`.

### 5.4 Add feedback

Suggested table: `anomaly_feedback`

Fields:

- `feedback_id UUID PRIMARY KEY`
- `anomaly_id UUID REFERENCES anomalies`
- `label`: `true_positive`, `false_positive`, `expected_change`, `duplicate`, `unknown`
- `comment`
- `created_by`
- `created_at`

This is required to measure real accuracy.

### 5.5 Add maintenance and deployment context

Suggested tables:

- `maintenance_windows`
- `deployment_events`

These allow the scorer to suppress or lower severity for expected changes.

## 6. Feature Engineering

Models should not train on only one raw row. Train and score using windows.

### 6.1 Server features

For each server and each scoring time:

- Current values: CPU, memory, disk, thread count
- Rolling means: 5m, 15m, 1h, 6h, 24h
- Rolling medians: 15m, 1h, 24h
- Rolling standard deviation and IQR
- Robust z-score using median and MAD
- Difference from previous window
- Percent change from 15m baseline
- EWMA values
- Slope over 15m and 1h
- Time of day
- Day of week
- Is weekend
- Environment
- Agent active/inactive
- Number of running services on the host

### 6.2 Service features

For each service and each scoring time:

- Service CPU and memory current values
- Rolling means and medians
- Robust z-score
- Process status
- Technology, such as Java, Node.js, Python, Nginx
- Parent server CPU, memory, disk
- Service-to-host CPU ratio
- Service-to-host memory ratio
- Restart/PID change indicator when available
- Application id and environment

### 6.3 Seasonal baselines

Some services are naturally busier at specific hours. Maintain optional seasonal baselines:

- Same hour of day over previous 7 to 28 days
- Same day of week over previous 4 weeks

Use seasonal baselines only when enough history exists. Until then, use rolling baselines and global fallback models.

### 6.4 Cold start logic

Use this hierarchy:

1. Static safety thresholds for all entities immediately.
2. Global environment model after the platform has enough total data.
3. Technology-level model for services, for example Java services or Node.js services.
4. Entity-specific rolling baseline after the entity has at least 7 days of history.
5. Entity-specific Isolation Forest after the entity has at least 14 days of stable history.

With 30 second server metrics, one server produces about 2,880 samples per day. With 120 second service discovery, one service produces about 720 samples per day.

## 7. Model Strategy

### 7.1 Recommended MVP detectors

Use an ensemble of these detectors:

1. Hard threshold detector
   - Purpose: catch obvious resource danger immediately.
   - Examples: CPU above 95 percent for 5 minutes, memory above 95 percent, disk above 90 percent, missing heartbeat.
   - This already partially exists in `deriveServerStatus`.

2. Robust rolling baseline detector
   - Purpose: catch unusual values compared to the entity's own history.
   - Method: median/IQR or median/MAD per metric and entity.
   - Good for CPU, memory, thread count, and service CPU/memory.

3. Isolation Forest detector
   - Purpose: catch multivariate anomalies that are not obvious from one metric.
   - Train on feature windows, not raw rows.
   - Use per-entity models when enough data exists, otherwise global models per environment and entity type.

4. Trend detector
   - Purpose: catch disk growth and memory leak patterns.
   - Method: slope over 1h/6h/24h plus projected time to threshold.
   - Disk should be treated as trend plus hard threshold, not as a normal spike metric.

### 7.2 Why Isolation Forest is a good first ML model

Isolation Forest is a strong first choice because:

- It is unsupervised, which matches the current lack of labeled anomalies.
- It handles multiple features together.
- It is relatively fast to train and score.
- It gives a usable anomaly score.
- It does not require assuming a Gaussian distribution.

Important configuration:

- `n_estimators`: start with 200
- `max_samples`: use `auto` or cap at 10,000 for large entities
- `contamination`: start very low, usually 0.005 to 0.02
- `random_state`: always fixed for reproducibility
- Threshold: do not blindly trust default contamination. Calibrate using validation data and target false positive rate.

### 7.3 When to use other methods

Use Local Outlier Factor only for offline analysis or novelty mode, because the default outlier mode is not designed for predicting new points.

Use One-Class SVM only for small, clean datasets. It is sensitive to outliers and requires careful tuning.

Use forecasting or autoregression after the platform has enough history and clear seasonality. A residual-based detector can work well when the expected value is predictable.

Do not start with LSTM/autoencoders. They need more data, more tuning, more monitoring, and more labels than this platform currently has.

### 7.4 Detector selection by metric

| Metric | Best first detector | Why |
| --- | --- | --- |
| Server CPU | Rolling baseline + Isolation Forest + hard threshold | CPU is noisy and contextual |
| Server memory | Rolling baseline + trend + hard threshold | Memory leak patterns matter |
| Server disk | Trend + hard threshold | Disk usually changes slowly |
| Thread count | Rolling baseline + Isolation Forest | Sudden jumps are useful signals |
| Service CPU | Rolling baseline + Isolation Forest | Service behavior differs by service |
| Service memory | Rolling baseline + trend | Memory leak and growth patterns |
| Agent heartbeat | Rule | Missing telemetry is deterministic |
| Service stopped | Rule + context | Stopped may be normal during maintenance |

## 8. Training Process

### 8.1 Training schedule

Run the trainer daily, for example at 02:00 local server time.

Retrain triggers:

- Scheduled daily retraining
- New entity has enough data
- Feedback shows high false positives
- Data drift is detected
- Model age exceeds 7 days for active models

### 8.2 Training data window

Initial window:

- Minimum: 7 days for rolling baselines
- Recommended: 14 to 30 days for Isolation Forest
- Better: 8 weeks if weekly patterns matter

Use time-based train/validation split:

- Train: older 70 to 80 percent of the time window
- Validate: most recent 20 to 30 percent

Never randomly split time-series data because it leaks future behavior into training.

### 8.3 Cleaning training data

Before training:

- Remove periods inside maintenance windows.
- Remove periods linked to open incidents.
- Remove samples with invalid ranges.
- Remove windows with too many missing samples.
- Optionally remove the most extreme 0.1 percent of values using a robust pre-filter.
- Keep a record of removed windows for audit.

Do not over-clean. If the model never sees normal traffic variation, it will page too often.

### 8.4 Training target

This is mostly unsupervised or semi-supervised ML:

- The model does not need anomaly labels to train.
- Labels are still required to evaluate quality.
- Human feedback and incidents become evaluation labels over time.

### 8.5 Model artifact

Store each trained model with:

- Model version
- Feature schema version
- Scaler parameters
- Model object
- Thresholds
- Training start and end time
- Code version or git SHA
- Evaluation metrics
- Training data counts and removed sample counts

Use `joblib` for scikit-learn artifacts.

## 9. Accuracy, Evaluation, And Guarantees

No ML anomaly detector can guarantee 100 percent correctness. What can be guaranteed is the process:

- Every model is evaluated before activation.
- Every anomaly has a score, reason, and model version.
- Every alert is deduplicated and rate limited.
- Human feedback is collected.
- Models can be rolled back.
- Production activation starts in shadow mode.

### 9.1 Evaluation data

Use four sources:

1. Historical incidents from the `incidents` and `anomalies` tables.
2. Human-labeled anomaly feedback.
3. Synthetic injected anomalies, such as CPU spikes, memory ramps, and missing telemetry.
4. Shadow-mode detections compared with real operator actions.

### 9.2 Metrics

Track these metrics:

- Precision: how many generated anomalies were real.
- Recall: how many known incidents were detected.
- F1 score: balance of precision and recall.
- False positives per server per day.
- False positives per service per day.
- Mean time to detect.
- Detection latency from `recorded_at` to anomaly creation.
- Duplicate incident rate.
- Percent of anomalies suppressed by maintenance/deployment context.
- Engineer acceptance rate.

### 9.3 Streaming evaluation

For real-time anomaly detection, early detection matters. Use event-window scoring:

- A detection is true positive if it occurs inside the labeled anomaly window or shortly before it.
- Earlier detections are better than late detections.
- Duplicate detections for the same event count as false positives unless they are correlated into one incident.

The Numenta Anomaly Benchmark is a useful reference because it evaluates real-time detectors with timing-aware scoring.

### 9.4 Promotion criteria

Before an ML model creates incidents automatically:

- Run in shadow mode for at least 7 to 14 days.
- Review top detections daily.
- Target false positives below an agreed threshold, for example less than 0.1 high/critical false positives per server per day.
- Confirm it catches known injected anomalies.
- Confirm scoring latency is below 60 seconds.
- Confirm rollback is tested.

## 10. Real-Time Scoring Process

Run scorer every 60 seconds for server metrics. For service metrics, score every 2 to 5 minutes.

### 10.1 Scoring steps

1. Load active model metadata.
2. Read new metric windows since the last watermark.
3. Build features using recent raw/rollup data.
4. Apply hard rules.
5. Apply rolling baseline detector.
6. Apply Isolation Forest when the entity has an active model.
7. Combine detector outputs.
8. Apply persistence and cooldown logic.
9. Suppress expected events from maintenance/deployment tables.
10. Create or update anomaly through backend internal API.

### 10.2 Persistence rules

Use persistence to reduce noise:

- Critical hard threshold: fire after 1 to 2 minutes.
- High severity ML anomaly: require 2 anomalous windows out of the last 3.
- Medium severity ML anomaly: require 3 anomalous windows out of the last 5.
- Low severity: store as anomaly event but do not create incident automatically.

### 10.3 Cooldown rules

Recommended cooldowns:

- Same host, same metric, high severity: 30 minutes
- Same service, same metric, medium severity: 60 minutes
- Critical severity: do not suppress if current incident is resolved and condition returns

### 10.4 Score combination

Use a simple first version:

```text
final_score = max(rule_score, rolling_score, isolation_forest_score, trend_score)
```

Then determine severity from score, persistence, and business context.

### 10.5 Example pseudocode

```python
for entity in active_entities:
    windows = load_recent_windows(entity, since=watermark)
    features = build_features(entity, windows)

    detections = []
    detections += hard_threshold_detector(features)
    detections += rolling_baseline_detector(features)

    model = registry.get_active_model(entity, "server_resource")
    if model:
        detections += isolation_forest_detector(model, features)

    event = aggregate_detections(detections)
    if not event:
        continue

    if is_suppressed(event):
        store_suppressed_event(event)
        continue

    if passes_persistence(event) and not in_cooldown(event):
        send_to_backend(event)
```

## 11. Severity Model

Severity should not come only from the ML score. It should combine score, persistence, resource risk, and environment.

### 11.1 Suggested mapping

Low:

- One weak anomaly
- No hard threshold breach
- No service impact
- Useful for dashboard only

Medium:

- Sustained anomaly
- Strong rolling baseline deviation
- Service or host is non-production

High:

- Strong anomaly score
- Production entity
- Multiple related metrics abnormal
- Metric is near a hard danger threshold

Critical:

- Severe resource exhaustion, for example CPU/memory above 95 percent with persistence
- Disk near full
- Production service stopped unexpectedly
- Agent missing for critical production server
- Multiple related services impacted

## 12. Backend Integration Plan

### 12.1 Backend anomaly API

The repository now includes the backend routes needed by the ML worker:

- `POST /api/ml/anomalies`
- `GET /api/anomalies`
- `GET /api/anomalies/:id`
- `PATCH /api/anomalies/:id/status`

The ML worker should not write incidents directly into PostgreSQL unless necessary. Prefer backend API because the backend already owns incident creation, timeline creation, auth, and future notifications.

### 12.2 Internal payload

Example payload from ML worker to backend:

```json
{
  "entity_type": "server",
  "server_id": 1,
  "service_id": null,
  "application_id": null,
  "anomaly_type": "CPU",
  "severity": "high",
  "title": "Unusual CPU usage on prod-server-01",
  "description": "CPU usage is 94.2%, above the learned normal range of 18.0% to 54.0% for this server and time window.",
  "metric_value": 94.2,
  "threshold": 54.0,
  "model_id": "uuid",
  "detector_name": "isolation_forest",
  "score": 0.91,
  "confidence": 0.84,
  "window_start": "2026-05-10T10:15:00Z",
  "window_end": "2026-05-10T10:20:00Z",
  "reason_codes": ["cpu_high_vs_baseline", "thread_count_high"],
  "fingerprint": "server:1:CPU:isolation_forest:202605101015"
}
```

### 12.3 Incident creation

Use this policy:

- Low severity: create anomaly only.
- Medium severity: create anomaly; create incident only if persisted or repeated.
- High severity: create anomaly and incident automatically unless suppressed.
- Critical severity: create anomaly and incident immediately.

The current backend anomaly service handles deduplication, suppression context, and high/critical incident creation. Keep incident creation inside the backend rather than inside the ML worker.

### 12.4 Frontend integration

Current `Anomalies.tsx` is wired to API data from `GET /api/anomalies` through `frontend/src/api/anomalyApi.ts`.

Display:

- Severity
- Entity
- Detector name
- Metric value
- Expected range
- Score/confidence
- Reason codes
- Linked incident
- Timeline state
- Feedback buttons: true positive, false positive, expected change, duplicate

## 13. ML Worker Structure

Suggested folder:

```text
ml/
  pyproject.toml
  app/
    config.py
    db.py
    backend_client.py
    registry.py
    features/
      server_features.py
      service_features.py
      rollups.py
    detectors/
      hard_rules.py
      rolling_baseline.py
      isolation_forest.py
      trend.py
      ensemble.py
    jobs/
      train_models.py
      score_realtime.py
      backfill_rollups.py
      evaluate_models.py
    tests/
      test_features.py
      test_detectors.py
      test_deduplication.py
```

Recommended dependencies:

- `pandas`
- `numpy`
- `scikit-learn`
- `joblib`
- `psycopg` or `SQLAlchemy`
- `pydantic`
- `APScheduler` for MVP scheduling
- `pytest`

## 14. Operations And Monitoring

The anomaly detector itself must be monitored.

Expose these ML worker metrics:

- `ml_scoring_latency_seconds`
- `ml_scoring_windows_total`
- `ml_anomalies_detected_total`
- `ml_anomalies_suppressed_total`
- `ml_model_age_hours`
- `ml_model_training_failures_total`
- `ml_feature_missing_ratio`
- `ml_backend_post_failures_total`
- `ml_duplicate_anomaly_suppressed_total`

Operational dashboards:

- Anomalies by detector and severity
- False positives by entity and detector
- Model age and active model count
- Scoring latency and backlog
- Top noisy entities
- Suppressed anomalies by reason

Rollback:

- Keep previous active model.
- Model registry supports `active` and `retired`.
- If false positives spike, switch back to rolling baseline only.

## 15. Rollout Roadmap

### Phase 0: Data quality and schema

- Add anomaly API route. Status: implemented in code.
- Add anomaly feedback. Status: table and API support implemented; feedback data still needs operators.
- Add model registry. Status: implemented and populated with 7 shadow models on 2026-05-18.
- Add rollup tables. Status: implemented and backfilled for 30 days on 2026-05-18.
- Add maintenance/deployment context. Status: tables implemented; data/integration still pending.
- Validate metric ranges during ingestion.

### Phase 1: Rules and dynamic baselines

- Implement 1m/5m rollups.
- Implement robust rolling baseline detector.
- Add deduplication and cooldown.
- Create anomaly rows without automatic incidents for low/medium severity.
- Show real anomalies in the frontend.

### Phase 2: Isolation Forest shadow mode

- Train global environment models and entity-specific models.
- Run scoring in shadow mode.
- Store detections but mark them as shadow or suppressed.
- Compare with incidents and operator feedback.
- Tune thresholds and contamination.

### Phase 3: Controlled incident automation

- Auto-create incidents for high/critical anomalies.
- Keep medium anomalies dashboard-only unless persistent.
- Add feedback buttons in incident/anomaly UI.
- Add weekly evaluation report.

### Phase 4: Expand observability signals

- Add service latency, error rate, request rate.
- Add network and disk I/O metrics.
- Add restart/crash metrics.
- Add deployment and maintenance integration.
- Add forecasting residual detectors for seasonal metrics.

## 16. First Implementation Defaults

Use these defaults unless data proves otherwise:

- Server scoring interval: 60 seconds
- Service scoring interval: 5 minutes
- Server rollup: 1 minute
- Service rollup: 5 minutes
- Minimum rolling baseline history: 7 days
- Minimum Isolation Forest history: 14 days
- Isolation Forest `n_estimators`: 200
- Isolation Forest `contamination`: 0.01
- High severity persistence: 2 of last 3 windows
- Medium severity persistence: 3 of last 5 windows
- Default high severity cooldown: 30 minutes
- Shadow mode duration before auto-incident: 7 to 14 days

## 17. Important Engineering Rules

- Do not train and evaluate on the same time period.
- Do not let future data leak into features.
- Do not create incidents directly from single noisy points except critical hard rules.
- Do not create one model for the entire fleet if entities behave very differently.
- Do not create one model per entity until there is enough history.
- Do not hide model outputs. Store score, threshold, model id, feature values, and reason codes.
- Do not promise perfect accuracy. Promise measured precision, recall, feedback, rollback, and continuous tuning.

## 18. References

- scikit-learn novelty and outlier detection guide: https://scikit-learn.org/stable/modules/outlier_detection.html
- scikit-learn Isolation Forest API: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html
- Numenta Anomaly Benchmark paper: https://arxiv.org/abs/1510.03336
- Numenta Anomaly Benchmark repository: https://github.com/numenta/NAB
- Prometheus alerting rules, especially `for` and `keep_firing_for` concepts for persistence and anti-flapping: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- ADTK detector documentation for time-series residual and event scoring concepts: https://adtk.readthedocs.io/en/stable/api/detectors.html
