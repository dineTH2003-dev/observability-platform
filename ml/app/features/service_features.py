from __future__ import annotations

import numpy as np
import pandas as pd

SERVICE_FEATURE_COLUMNS = [
    "cpu_avg",
    "cpu_last",
    "memory_avg",
    "memory_last",
    "server_cpu_avg",
    "server_memory_avg",
    "service_to_server_cpu_ratio",
    "service_to_server_memory_ratio",
    "cpu_robust_z_1h",
    "memory_robust_z_1h",
    "cpu_delta_15m",
    "memory_delta_15m",
    "hour_of_day",
    "day_of_week",
    "is_weekend",
    "missing_count",
]


def load_service_rollups(conn, *, days: int | None = None, minutes: int | None = None) -> pd.DataFrame:
    if days is None and minutes is None:
        days = 14

    interval_value = days if days is not None else minutes
    interval_unit = "days" if days is not None else "minutes"

    rows = conn.execute(
        f"""
        SELECT
          r.*,
          svc.server_id,
          svc.application_id,
          svc.name AS service_name,
          svc.technology,
          svc.status AS service_status,
          srv.hostname,
          srv.environment,
          sr.cpu_avg AS server_cpu_avg,
          sr.memory_avg AS server_memory_avg
        FROM service_metric_rollups_5m r
        JOIN services svc ON svc.service_id = r.service_id
        JOIN servers srv ON srv.server_id = svc.server_id
        LEFT JOIN server_metric_rollups_1m sr
          ON sr.server_id = svc.server_id
         AND sr.window_start = date_trunc('minute', r.window_start)
        WHERE r.window_start >= NOW() - (%s || ' {interval_unit}')::INTERVAL
        ORDER BY r.service_id, r.window_start
        """,
        (interval_value,),
    ).fetchall()
    return pd.DataFrame(rows)


def build_service_features(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    out = df.copy()
    out["window_start"] = pd.to_datetime(out["window_start"], utc=True)
    out = out.sort_values(["service_id", "window_start"])

    numeric_cols = [
        "cpu_avg",
        "cpu_last",
        "memory_avg",
        "memory_last",
        "server_cpu_avg",
        "server_memory_avg",
        "missing_count",
    ]
    for col in numeric_cols:
        out[col] = pd.to_numeric(out[col], errors="coerce")

    grouped = out.groupby("service_id", group_keys=False)
    for source, prefix in [("cpu_avg", "cpu"), ("memory_avg", "memory")]:
        median = grouped[source].apply(lambda s: s.shift(1).rolling(12, min_periods=4).median())
        q75 = grouped[source].apply(lambda s: s.shift(1).rolling(12, min_periods=4).quantile(0.75))
        q25 = grouped[source].apply(lambda s: s.shift(1).rolling(12, min_periods=4).quantile(0.25))
        iqr = (q75 - q25).replace(0, np.nan)
        out[f"{prefix}_baseline_1h"] = median
        out[f"{prefix}_iqr_1h"] = iqr
        out[f"{prefix}_robust_z_1h"] = ((out[source] - median) / iqr).replace([np.inf, -np.inf], np.nan)

    out["cpu_delta_15m"] = grouped["cpu_avg"].diff(3)
    out["memory_delta_15m"] = grouped["memory_avg"].diff(3)
    out["service_to_server_cpu_ratio"] = out["cpu_avg"] / out["server_cpu_avg"].replace(0, np.nan)
    out["service_to_server_memory_ratio"] = out["memory_avg"] / out["server_memory_avg"].replace(0, np.nan)
    out["hour_of_day"] = out["window_start"].dt.hour
    out["day_of_week"] = out["window_start"].dt.dayofweek
    out["is_weekend"] = out["day_of_week"].isin([5, 6]).astype(int)

    for col in SERVICE_FEATURE_COLUMNS:
        if col not in out.columns:
            out[col] = 0
    out[SERVICE_FEATURE_COLUMNS] = out[SERVICE_FEATURE_COLUMNS].fillna(0)
    return out
