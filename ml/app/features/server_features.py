from __future__ import annotations

import numpy as np
import pandas as pd

SERVER_FEATURE_COLUMNS = [
    "cpu_avg",
    "cpu_last",
    "memory_avg",
    "memory_last",
    "disk_avg",
    "disk_last",
    "thread_count_avg",
    "thread_count_last",
    "cpu_robust_z_1h",
    "memory_robust_z_1h",
    "disk_robust_z_1h",
    "thread_count_robust_z_1h",
    "cpu_delta_5m",
    "memory_delta_5m",
    "disk_delta_30m",
    "thread_count_delta_5m",
    "hour_of_day",
    "day_of_week",
    "is_weekend",
    "missing_count",
]


def load_server_rollups(conn, *, days: int | None = None, minutes: int | None = None) -> pd.DataFrame:
    if days is None and minutes is None:
        days = 14

    interval_value = days if days is not None else minutes
    interval_unit = "days" if days is not None else "minutes"

    rows = conn.execute(
        f"""
        SELECT
          r.*,
          s.hostname,
          s.environment,
          s.agent_status,
          s.server_status
        FROM server_metric_rollups_1m r
        JOIN servers s ON s.server_id = r.server_id
        WHERE r.window_start >= NOW() - (%s || ' {interval_unit}')::INTERVAL
        ORDER BY r.server_id, r.window_start
        """,
        (interval_value,),
    ).fetchall()
    return pd.DataFrame(rows)


def build_server_features(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    out = df.copy()
    out["window_start"] = pd.to_datetime(out["window_start"], utc=True)
    out = out.sort_values(["server_id", "window_start"])

    numeric_cols = [
        "cpu_avg",
        "cpu_last",
        "memory_avg",
        "memory_last",
        "disk_avg",
        "disk_last",
        "thread_count_avg",
        "thread_count_last",
        "missing_count",
    ]
    for col in numeric_cols:
        out[col] = pd.to_numeric(out[col], errors="coerce")

    grouped = out.groupby("server_id", group_keys=False)
    for source, prefix in [
        ("cpu_avg", "cpu"),
        ("memory_avg", "memory"),
        ("disk_avg", "disk"),
        ("thread_count_avg", "thread_count"),
    ]:
        median = grouped[source].apply(lambda s: s.shift(1).rolling(60, min_periods=10).median())
        q75 = grouped[source].apply(lambda s: s.shift(1).rolling(60, min_periods=10).quantile(0.75))
        q25 = grouped[source].apply(lambda s: s.shift(1).rolling(60, min_periods=10).quantile(0.25))
        iqr = (q75 - q25).replace(0, np.nan)
        out[f"{prefix}_baseline_1h"] = median
        out[f"{prefix}_iqr_1h"] = iqr
        out[f"{prefix}_robust_z_1h"] = ((out[source] - median) / iqr).replace([np.inf, -np.inf], np.nan)

    out["cpu_delta_5m"] = grouped["cpu_avg"].diff(5)
    out["memory_delta_5m"] = grouped["memory_avg"].diff(5)
    out["disk_delta_30m"] = grouped["disk_avg"].diff(30)
    out["thread_count_delta_5m"] = grouped["thread_count_avg"].diff(5)
    out["hour_of_day"] = out["window_start"].dt.hour
    out["day_of_week"] = out["window_start"].dt.dayofweek
    out["is_weekend"] = out["day_of_week"].isin([5, 6]).astype(int)

    for col in SERVER_FEATURE_COLUMNS:
        if col not in out.columns:
            out[col] = 0
    out[SERVER_FEATURE_COLUMNS] = out[SERVER_FEATURE_COLUMNS].fillna(0)
    return out
