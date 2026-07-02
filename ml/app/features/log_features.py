from __future__ import annotations

import numpy as np
import pandas as pd


LOG_FEATURE_COLUMNS = [
    "total_count",
    "error_count",
    "warning_count",
    "info_count",
    "debug_count",
    "error_rate",
    "warning_rate",
    "error_rate_robust_z_1h",
    "volume_robust_z_1h",
]


def load_log_rollups(conn, *, days: int | None = None, minutes: int | None = None) -> pd.DataFrame:
    if days is None and minutes is None:
        days = 14

    interval_value = days if days is not None else minutes
    interval_unit = "days" if days is not None else "minutes"

    rows = conn.execute(
        f"""
        SELECT
          r.*,
          s.name as service_name,
          s.server_id,
          s.application_id,
          lc.is_enabled as log_enabled
        FROM log_metric_rollups_5m r
        JOIN services s ON s.service_id = r.service_id
        LEFT JOIN log_configs lc ON lc.service_id = r.service_id
        WHERE r.window_start >= NOW() - (%s || ' {interval_unit}')::INTERVAL
        ORDER BY r.service_id, r.window_start
        """,
        (interval_value,),
    ).fetchall()
    return pd.DataFrame(rows)


def build_log_features(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    out = df.copy()
    out["window_start"] = pd.to_datetime(out["window_start"], utc=True)
    out = out.sort_values(["service_id", "window_start"])

    numeric_cols = [
        "total_count",
        "error_count",
        "warning_count",
        "info_count",
        "debug_count",
    ]
    for col in numeric_cols:
        out[col] = pd.to_numeric(out[col], errors="coerce").fillna(0)

    # Calculate rates
    out["error_rate"] = np.where(out["total_count"] > 0, out["error_count"] / out["total_count"], 0.0)
    out["warning_rate"] = np.where(out["total_count"] > 0, out["warning_count"] / out["total_count"], 0.0)

    # Group by service to compute rolling baselines
    grouped = out.groupby("service_id", group_keys=False)
    
    # Error rate robust z-score (1h = 12 * 5m windows)
    error_rate_median = grouped["error_rate"].apply(lambda s: s.shift(1).rolling(12, min_periods=3).median())
    error_rate_q75 = grouped["error_rate"].apply(lambda s: s.shift(1).rolling(12, min_periods=3).quantile(0.75))
    error_rate_q25 = grouped["error_rate"].apply(lambda s: s.shift(1).rolling(12, min_periods=3).quantile(0.25))
    error_rate_iqr = (error_rate_q75 - error_rate_q25).replace(0, np.nan)
    out["error_rate_baseline_1h"] = error_rate_median
    out["error_rate_iqr_1h"] = error_rate_iqr
    out["error_rate_robust_z_1h"] = ((out["error_rate"] - error_rate_median) / error_rate_iqr).replace([np.inf, -np.inf], np.nan)

    # Volume robust z-score (1h = 12 * 5m windows)
    volume_median = grouped["total_count"].apply(lambda s: s.shift(1).rolling(12, min_periods=3).median())
    volume_q75 = grouped["total_count"].apply(lambda s: s.shift(1).rolling(12, min_periods=3).quantile(0.75))
    volume_q25 = grouped["total_count"].apply(lambda s: s.shift(1).rolling(12, min_periods=3).quantile(0.25))
    volume_iqr = (volume_q75 - volume_q25).replace(0, np.nan)
    out["volume_baseline_1h"] = volume_median
    out["volume_iqr_1h"] = volume_iqr
    out["volume_robust_z_1h"] = ((out["total_count"] - volume_median) / volume_iqr).replace([np.inf, -np.inf], np.nan)

    for col in LOG_FEATURE_COLUMNS:
        if col not in out.columns:
            out[col] = 0.0
    
    return out
