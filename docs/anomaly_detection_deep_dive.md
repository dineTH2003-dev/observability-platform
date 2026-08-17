# Anomaly Detection System: Complete A-to-Z Architecture

This document explains every component of your anomaly detection pipeline — from the moment raw data enters the system all the way to an incident appearing on your dashboard.

---

## Part 1: System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                                 │
│  mock_agent.py  ──► Real AWS Agent (future)                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │ POST /api/agent/metrics, /services, /logs
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND API (Node.js :9000)                     │
│   /api/agent/metrics  →  server_metrics table                       │
│   /api/agent/services →  service_metrics table                      │
│   /api/agent/logs     →  logs table                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  PostgreSQL (Neon Cloud)                             │
│  server_metrics, service_metrics, logs                              │
│  server_metric_rollups_1m, service_metric_rollups_1m                │
│  log_rollups_1h                                                     │
│  ml_models, ml_metric_baselines                                     │
│  anomalies, anomaly_ml_details                                      │
│  incidents, incident_timeline                                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │  SQL reads (every 60 seconds)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ML WORKER (Python)                               │
│                                                                     │
│  1. Rollup Backfill  →  Ensures aggregated windows are ready        │
│  2. Feature Engineering  →  Calculates z-scores, deltas, baselines  │
│  3. DETECTORS (6 types)  →  Each scores the data for anomalies     │
│  4. Ensemble  →  Picks the single best detection per entity         │
│  5. Backend Client  →  POSTs detection to backend API               │
└────────────────────────────┬────────────────────────────────────────┘
                             │ POST /api/ml/anomalies (x-ml-token)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BACKEND: Anomaly Service + Incident Service            │
│  - Normalizes & deduplicates anomaly by fingerprint                 │
│  - Stores in anomalies + anomaly_ml_details tables                  │
│  - If severity = high/critical + auto_create_incident=True:         │
│    → Creates incident, writes timeline event, links to anomaly      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│               FRONTEND (React :3000)                                │
│   /anomalies page  →  Shows all detected anomalies                  │
│   /incidents page  →  Shows auto-created incidents + timeline       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Step-by-Step Data Flow (A to Z)

### Step A: Data Ingestion via Mock Agent / Real Agent

Your `mock_agent.py` simulates a real server agent. It sends **three types of data** to the backend every 30 seconds:

**1. Server Metrics** (`POST /api/agent/metrics`)
```json
{
  "server_id": 5,
  "cpu_usage": 0.8,        // Normal: 0-1.5%
  "memory_usage": 80.2,    // Normal: 78-82%
  "disk_usage": 64.0,      // Normal: 63-65%
  "thread_count": 490      // Normal: 474-506
}
```
When an anomaly is injected: CPU spikes to 90-99%, memory to 92-98%, threads to 800-1000.

**2. Service Metrics** (`POST /api/agent/services`)
```json
{
  "server_id": 5,
  "services": [
    { "name": "api-gateway", "cpu_usage": 0.5, "memory_usage": 9.8 },
    { "name": "mysqld",      "cpu_usage": 0.2, "memory_usage": 13.3 }
  ]
}
```

**3. Logs** (`POST /api/agent/logs`)
```json
{
  "server_id": 5,
  "logs": [
    { "service_id": 3, "level": "error", "message": "java.lang.OutOfMemoryError" },
    { "service_id": 1, "level": "warn",  "message": "Too many connections." }
  ]
}
```

All this data is stored **raw** in the database tables: `server_metrics`, `service_metrics`, `logs`.

---

### Step B: Rollup Aggregation (Pre-processing)

Raw metrics come in frequently and are noisy. Before the ML models can analyze them, they must be aggregated into **time windows**. The ML worker runs `backfill_server_rollups()` and `backfill_service_rollups()` every cycle.

The rollup process takes the raw per-reading data and creates **1-minute windowed summaries** stored in `server_metric_rollups_1m`:
- `cpu_avg`, `cpu_last` — average and final reading in the window
- `memory_avg`, `memory_last`
- `disk_avg`, `disk_last`
- `thread_count_avg`, `thread_count_last`
- `missing_count` — how many expected readings were absent

**Why this matters:** Instead of analyzing 100s of raw readings, every detector works on clean, comparable 1-minute windows. This removes noise and makes pattern detection reliable.

---

### Step C: Feature Engineering

Once rollups are ready, the ML worker builds a rich **feature matrix** using `build_server_features()`. This is where raw numbers become meaningful signals.

For **every 1-minute window**, the following are calculated:

| Feature | Description | Example |
|---|---|---|
| `cpu_avg`, `cpu_last` | Raw CPU from rollup | `98.5` |
| `cpu_baseline_1h` | Rolling 60-window **median** of past CPU | `0.8` |
| `cpu_iqr_1h` | **Interquartile Range** of past 60 windows (spread measure) | `0.3` |
| `cpu_robust_z_1h` | **(current - median) / IQR** — how far from normal | `325.7` ← massive |
| `cpu_delta_5m` | How much CPU changed in the last 5 minutes | `+97.2` |
| `disk_delta_30m` | How much disk grew in 30 mins (for trend detection) | `+0.1` |
| `hour_of_day` | 0-23 — captures daily patterns | `14` |
| `day_of_week` | 0=Mon, 6=Sun — captures weekly patterns | `2` |
| `is_weekend` | 1 or 0 | `0` |

**The Robust Z-Score is the most important feature.** A normal CPU z-score is between -3 and +3. When our mock agent injects a 98% CPU spike on a server that normally runs at 0.8%, the z-score becomes `(98 - 0.8) / 0.3 = 324`! That is a 324-sigma event — astronomically impossible if the system were normal.

---

## Part 3: The 6 Detectors (How Anomalies Are Identified)

Every 60 seconds, the ML worker runs **all applicable detectors in parallel** on the feature data for each entity. Each detector uses a different method.

---

### Detector 1: Hard Rules (`hard_rules.py`)

**What it does:** Applies absolute threshold rules — no statistics, no ML, just "if this value exceeds X, it's definitely an anomaly."

**Triggers for servers:**
| Metric | Threshold | Severity |
|---|---|---|
| `cpu_last` | ≥ 95% | CRITICAL |
| `memory_last` | ≥ 95% | CRITICAL |
| `disk_last` | ≥ 90% | CRITICAL |
| `missing_count > 0` | Any gap | MEDIUM |

**Triggers for services:**
| Metric | Threshold | Severity |
|---|---|---|
| `cpu_last` | ≥ 95% | CRITICAL |
| `memory_last` | ≥ 95% | CRITICAL |

**Real Example:**
> Mock agent sends `cpu_usage: 96.5`. The hard rule check finds `cpu_last = 96.5 ≥ 95.0`. It immediately creates a **CRITICAL** detection: *"CPU danger threshold crossed on App_Server_1"* with `score = 96.5 / 100 = 0.965` and `confidence = 0.95`.

**Why this exists:** It's a safety net. Even if all the statistical models fail to learn, a server at 96% CPU is *always* a problem. No training required.

**Auto-creates incident?** Only if explicitly set (currently not set for hard rules, so `auto_create_incident = None`, which the backend treats as `False`).

---

### Detector 2: Rolling Baseline (`rolling_baseline.py`)

**What it does:** Uses the **Robust Z-Score** (from Step C) to detect values that are statistically far from the learned normal behavior. This is sometimes called a "statistical process control" method.

**Trigger threshold:** `z-score ≥ 4.0`
- `z-score 4.0–8.0` → **MEDIUM severity**
- `z-score ≥ 8.0` → **HIGH severity** (auto-creates incident!)

**Metrics monitored for servers:** CPU, MEMORY, DISK, THREAD_COUNT
**Metrics monitored for services:** CPU, MEMORY

**How the score and bounds are calculated:**
```
upper_bound = baseline + (4.0 × IQR)  # where normal data ends
score       = min(1.0, z_score / 10.0) # normalized 0-1 score
confidence  = min(0.95, 0.55 + score/2)
```

**Real Example:**
> Server normally runs at CPU=0.8% (baseline) with IQR=0.3. Mock agent sends CPU=98%.
> - `z-score = (98 - 0.8) / 0.3 = 324`
> - Trigger: `324 ≥ 4.0` ✓
> - Severity: `324 ≥ 8.0` → **HIGH**
> - `score = min(1.0, 324/10) = 1.0` (maximum)
> - Detection: *"Unusual cpu usage on App_Server_1"*
> - Auto-creates incident: **YES**

**Why this is powerful:** It learns YOUR server's normal behavior, not a generic threshold. A server that normally runs at 60% CPU won't trigger just because it hits 65%. But a server that normally runs at 0.8% will trigger at 5%.

---

### Detector 3: Trend Detector (`trend.py`)

**What it does:** Detects when disk usage is **consistently growing** — even if it hasn't hit a threshold yet. It predicts future problems.

**Trigger condition:** `disk_delta_30m ≥ 2.0%` AND `disk_avg ≥ 75%`

**Key calculation — "Time to Full":**
```python
projected_hours = ((90.0 - disk_value) / disk_delta) × 0.5
```
- If projected_hours ≤ 6 → **HIGH severity** (disk will be critically full in 6 hours!)
- If projected_hours > 6 → **MEDIUM severity**

**Real Example:**
> Disk is at 80% and growing 3% per 30 minutes. Projection: `(90-80)/3 × 0.5 = 1.67 hours` to hit 90%. This is a **HIGH** severity trend anomaly with auto-incident creation.

**Why this is unique:** It catches slow-burn disasters before they become crises. A disk filling gradually over hours would never trigger hard rules until it's too late.

---

### Detector 4: Isolation Forest (`isolation_forest.py`)

**What it does:** This is the core **machine learning** model. It uses scikit-learn's `IsolationForest` algorithm to detect multi-variate anomalies — combinations of metrics that are unusual *together*, even if no single metric is extreme.

**How Isolation Forest works (conceptually):**
1. During **training**, the model sees hundreds of normal windows and builds random decision trees.
2. Normal points require many cuts to isolate (they cluster together).
3. Anomalous points are easy to isolate — they sit far from the cluster and need very few cuts.
4. The model gives each point a **decision score**: negative = anomalous, positive = normal.

**Training:**
```python
model = Pipeline([
    ("scaler", RobustScaler()),  # Makes features comparable in scale
    ("isolation_forest", IsolationForest(
        n_estimators=200,        # 200 trees (configurable)
        contamination=0.01,      # Expects 1% of data to be anomalous
        random_state=42,         # For reproducibility
    ))
])
```

**At inference (scoring):**
```python
decision = model.decision_function(current_window)
anomaly_score = max(0.0, -decision)  # Flip: negative decisions become positive scores
threshold = 99th percentile of training anomaly scores
```

**Feature columns used (20 features):**
`cpu_avg, cpu_last, memory_avg, memory_last, disk_avg, disk_last, thread_count_avg, thread_count_last, cpu_robust_z_1h, memory_robust_z_1h, disk_robust_z_1h, thread_count_robust_z_1h, cpu_delta_5m, memory_delta_5m, disk_delta_30m, thread_count_delta_5m, hour_of_day, day_of_week, is_weekend, missing_count`

**Model status — Shadow vs Active:**
- **Shadow**: Model runs and detects, but `confidence = 0.55` (lower trust) and `auto_create_incident = False`. This lets the model be observed without creating noise.
- **Active**: Full trust, `confidence = 0.80`, can create incidents automatically.

**Real Example:**
> Even if CPU isn't extreme but memory AND CPU are both elevated AND it's 3am (unusual hour), Isolation Forest may flag it as anomalous because *that combination together* has never appeared in training data.

---

### Detector 5: Log Anomaly (`log_anomaly.py`)

**What it does:** Analyzes service log patterns to detect two types of problems:

**A — Error Rate Spike:**
```
Trigger: error_rate_robust_z_1h ≥ 4.0 AND error_count ≥ 5
HIGH:    z ≥ 8.0 (auto-creates incident)
MEDIUM:  z 4.0–8.0
```
The error_rate is `error_count / total_log_count`. Its baseline and IQR are calculated from hourly log rollups, same as metrics. If a service goes from 0.1% error rate to 20% error rate, the z-score explodes.

**B — Log Volume Anomaly:**
```
Trigger: |volume_robust_z_1h| ≥ 5.0 AND baseline > 20 logs
```
A sudden DROP in log volume (volume_z < 0) can mean a service silently crashed. A sudden SPIKE can mean a service is flooding logs due to errors.

**Real Example:**
> `api-gateway` normally produces 1% error logs (baseline=0.01, IQR=0.005). After memory exhaustion: 50% errors.
> `z = (0.50 - 0.01) / 0.005 = 98` → **HIGH** severity: *"High Error Rate detected on api-gateway"*

---

### Detector 6: Telemetry Gap Detector (`telemetry.py`)

**What it does:** Monitors whether agents are *actually sending data*. If a server stops reporting, that itself is an anomaly (agent crash, network issue, server down).

**It checks:**
- How long since the last server metric arrived (`server_metric_stale`)
- Whether the agent status is "ACTIVE" or something else
- Same checks for services

**Severity is based on environment:**
- Production environments + long gaps → **HIGH**
- Development/staging → **MEDIUM**

> [!NOTE]
> This detector intentionally sets `auto_create_incident=False` even for HIGH severity. This is by design — agent restarts shouldn't trigger incidents. An operator should review telemetry gaps manually.

---

## Part 4: The Ensemble — Choosing the Best Detection

After all detectors run on a single entity's window, you might have multiple detections at the same time (e.g., hard_rule says CRITICAL, rolling_baseline says HIGH, isolation_forest says MEDIUM). The system doesn't post all of them — it picks **one winner** using `choose_best_detection()`:

```python
severity_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
winner = sorted(
    detections,
    key=lambda d: (severity_rank[d.severity], d.score, d.confidence),
    reverse=True
)[0]
```

**Priority:** Severity first → then score → then confidence.

**Real Example:**
> For App_Server_1 after a CPU spike, 3 detectors fire:
> 1. `hard_rule`: CRITICAL, score=0.965, confidence=0.95
> 2. `rolling_baseline`: HIGH, score=1.0, confidence=0.95
> 3. `isolation_forest`: HIGH, score=0.8, confidence=0.55 (shadow mode)
>
> Winner → **hard_rule CRITICAL** (highest severity + high score/confidence)

Only 1 anomaly record is posted to the backend per entity per scoring cycle.

---

## Part 5: Backend Processing — From Detection to Database

Once the ML worker posts to `POST /api/ml/anomalies`, the backend does the following:

### Step 1: Token Authentication
The request must include `x-ml-token: development_token`. This is verified by `internalMl.middleware.js`. If wrong → 401 rejected.

### Step 2: Normalize the Payload (`normalizeMlPayload`)
- Validates `anomaly_type` is present
- Normalizes severity (`warning` → `medium`)
- Infers `entity_type` from which ID is provided (server/service/application)
- Builds a **fingerprint** for deduplication:
  ```
  "server:5:CPU:hard_rule:2026-06-30T05:51:00.000Z"
  ```

### Step 3: Deduplication by Fingerprint
The fingerprint is unique per (entity, anomaly type, detector, time window). If the same fingerprint already exists in `anomaly_ml_details`, it returns the existing anomaly instead of creating a duplicate. This prevents the same event being recorded dozens of times across multiple worker cycles.

### Step 4: Store Anomaly (in a DB transaction)
```sql
INSERT INTO anomalies (server_id, service_id, anomaly_type, severity, title, ...)
INSERT INTO anomaly_ml_details (anomaly_id, detector_name, score, fingerprint, ...)
```

### Step 5: Automatic Incident Creation
```javascript
if (auto_create_incident && ['high', 'critical'].includes(severity)) {
    // Create incident
    INSERT INTO incidents (title, severity) → returns incident_id
    // Link anomaly to incident
    UPDATE anomalies SET incident_id = ... WHERE anomaly_id = ...
    // Write timeline
    INSERT INTO incident_timeline (event_type='created', message='Incident auto-created from...')
}
```

**What gets stored in the incident:**
| Field | Example |
|---|---|
| `incident_number` | 4 |
| `title` | "Unusual metric combination on App_Server_1" |
| `severity` | "high" |
| `status` | "open" |
| `assigned_to` | null (unassigned initially) |
| `created_at` | 2026-06-30 05:51:20 |
| Timeline entry | "Incident auto-created from MULTIVARIATE ML anomaly" |

---

## Part 6: Complete Real Example (End-to-End)

Here is exactly what happens when you inject a CPU anomaly:

**Time 0:00** — `mock_agent.py` sends `cpu_usage: 97.2` for App_Server_1
```
Backend stores: server_metrics (server_id=5, cpu_usage=97.2, recorded_at=NOW)
```

**Time 0:01** — ML worker cycle begins
```
1. Rollup backfill: Creates window in server_metric_rollups_1m
   → cpu_avg=97.2, cpu_last=97.2, missing_count=0

2. Feature engineering:
   → cpu_baseline_1h = 0.8 (rolling 60-window median)
   → cpu_iqr_1h = 0.3
   → cpu_robust_z_1h = (97.2 - 0.8) / 0.3 = 321.3

3. Detectors run:
   → hard_rule:         cpu_last=97.2 ≥ 95 → CRITICAL detection
   → rolling_baseline:  z=321.3 ≥ 8.0     → HIGH detection
   → isolation_forest:  anomaly_score=0.8  → HIGH detection (shadow)

4. Ensemble:
   → Winner = hard_rule (CRITICAL beats HIGH)

5. BackendClient.post_anomaly({
     entity_type: "server", server_id: 5,
     anomaly_type: "CPU", severity: "critical",
     metric_value: 97.2, threshold: 95.0,
     score: 0.972, confidence: 0.95,
     title: "CPU danger threshold crossed on App_Server_1",
     ...
   })
```

**Time 0:01+** — Backend processes the POST
```
1. Auth: x-ml-token = "development_token" ✓
2. Fingerprint = "server:5:CPU:hard_rule:2026-06-30T05:01:00Z"
3. No duplicate found
4. INSERT INTO anomalies → anomaly_id = "abc-123"
5. INSERT INTO anomaly_ml_details → score=0.972, fingerprint=...
6. auto_create_incident = None (hard_rule doesn't set this)
   → No incident created for hard_rule
```

**Note:** The rolling_baseline at HIGH severity DOES set `auto_create_incident=True`. So when that detection wins (if hard_rule isn't triggered), an incident IS created automatically.

---

## Part 7: Accuracy Measurement

The system uses several mechanisms to measure and improve accuracy:

### A. User Feedback System
Every anomaly on the **Anomalies page** has feedback buttons:
- ✓ **True Positive** — "Yes, this was a real problem"
- ✗ **False Positive** — "No, this was normal"
- **Expected** — "This happened but was planned"
- **Duplicate** — "We already knew about this"

This data is stored in `anomaly_feedback`. Over time, it can be used to:
1. Calculate `precision = true_positives / (true_positives + false_positives)`
2. Retrain models excluding known false positive patterns

### B. Model Metadata in `ml_models` Table
When a model is trained, these accuracy metrics are stored in the `metrics` JSON column:
```json
{
  "training_rows": 2450,
  "contamination": 0.01,
  "n_estimators": 200
}
```

### C. Shadow Mode for Safe Testing
New models start in **shadow** mode:
- They score data and detect anomalies
- But `confidence = 0.55` (low) and `auto_create_incident = False`
- No real incidents are created
- Engineers can review these "shadow detections" to evaluate whether the model is good
- Once validated, the model is promoted to **active** status

### D. Score and Confidence as Proxy Metrics
Every anomaly stores:
- **Score (0–1)**: How extreme is the anomaly? `1.0` = maximally anomalous
- **Confidence (0–0.95)**: How sure is the model? Hard rules = 0.95, shadow models = 0.55

### E. Deduplication = Precision Protection
The fingerprint deduplication system prevents the same event from flooding the anomalies table. This artificially improves precision by ensuring each unique event appears exactly once.

---

## Part 8: Anomaly Trigger Scenarios (When Does It Fire?)

| Scenario | Which Detector | Severity | Auto-Incident? |
|---|---|---|---|
| CPU hits 96% for 1 minute | hard_rule | CRITICAL | No (none set) |
| CPU slowly climbs to 97% over 5 mins, normal is 0.8% | rolling_baseline | HIGH | ✅ Yes |
| Disk at 80% growing 3%/30min (will be full in <6hrs) | trend | HIGH | ✅ Yes |
| All metrics look weird together but no single spike | isolation_forest | MEDIUM/HIGH | If active model |
| api-gateway logs jump from 1% to 50% error rate | log_anomaly | HIGH | ✅ Yes |
| 100 error logs in 5 minutes, normally 2 | log_anomaly | HIGH | ✅ Yes |
| Log volume drops to 0 (service silenced) | log_anomaly | HIGH | ✅ Yes |
| Agent sends no data for 10 minutes | telemetry_gap | HIGH | ❌ No (by design) |
| Memory at 95% + CPU 90% during off-hours | isolation_forest | HIGH | If active + not shadow |

---

## Part 9: Key Design Decisions Explained

1. **Why 6 detectors instead of 1?**
   No single method catches everything. Hard rules catch acute spikes immediately. Rolling baseline learns normal behavior. Isolation Forest catches complex multi-metric patterns. Log anomaly catches application-level errors. Each fills a gap the others miss.

2. **Why Robust Z-Score instead of regular Z-Score?**
   Regular Z-Score uses mean and standard deviation, which are heavily skewed by outliers. Robust Z-Score uses median and IQR, which ignore outliers. This means a single past spike doesn't permanently raise the "normal" baseline.

3. **Why one detection per entity per cycle?**
   Without the ensemble, a single CPU spike would generate 3-4 anomaly records simultaneously (one per detector). The frontend and incident system would be flooded. The ensemble ensures exactly 1 clean signal per entity per cycle.

4. **Why shadow mode?**
   Training a model on insufficient data produces unreliable results. Shadow mode lets the model "practice" on real data while humans validate its output — without polluting the incident queue with false alarms.

5. **Why fingerprinting?**
   The worker runs every 60 seconds. Without fingerprinting, a 5-minute CPU spike would create 5 identical anomaly records. Fingerprinting ensures the same event (same entity + type + detector + time window) is recorded exactly once.
