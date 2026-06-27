from __future__ import annotations

import argparse
import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from app.config import settings
from app.db import get_conn


def main() -> None:
    parser = argparse.ArgumentParser(description="Report ML data/model readiness from the live database.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    parser.add_argument("--freshness-hours", type=int, default=24)
    parser.add_argument("--training-days", type=int, default=14)
    args = parser.parse_args()

    with get_conn() as conn:
        report = build_report(
            conn,
            freshness_hours=args.freshness_hours,
            training_days=args.training_days,
        )

    if args.json:
        print(json.dumps(report, indent=2, default=_json_default))
    else:
        print_text_report(report)


def build_report(conn, *, freshness_hours: int = 24, training_days: int = 14) -> dict[str, Any]:
    db_now = conn.execute("SELECT NOW() AS now").fetchone()["now"]
    table_counts = _table_counts(conn)
    metric_ranges = _metric_ranges(conn)
    entity_summary = _entity_summary(conn)
    model_summary = _model_summary(conn)
    feedback_summary = _feedback_summary(conn)
    training_windows = _training_windows(conn, training_days=training_days)
    freshness = _freshness(conn, freshness_hours=freshness_hours)

    recommendations = _recommendations(
        freshness=freshness,
        model_summary=model_summary,
        feedback_summary=feedback_summary,
        training_windows=training_windows,
        freshness_hours=freshness_hours,
        training_days=training_days,
    )

    return {
        "database_now": db_now,
        "settings": {
            "min_training_rows": settings.min_training_rows,
            "freshness_hours": freshness_hours,
            "training_days": training_days,
            "isolation_contamination": settings.isolation_contamination,
            "isolation_estimators": settings.isolation_estimators,
        },
        "table_counts": table_counts,
        "entities": entity_summary,
        "metric_ranges": metric_ranges,
        "freshness": freshness,
        "training_windows": training_windows,
        "models": model_summary,
        "feedback": feedback_summary,
        "recommendations": recommendations,
    }


def print_text_report(report: dict[str, Any]) -> None:
    print("ML readiness report")
    print(f"database_now={report['database_now']}")
    print(f"min_training_rows={report['settings']['min_training_rows']}")

    print("\nTable counts")
    for name, count in report["table_counts"].items():
        print(f"  {name}: {count}")

    print("\nMetric ranges")
    for item in report["metric_ranges"]:
        print(
            f"  {item['source']}: rows={item['rows']} entities={item['entities']} "
            f"first={item['first_seen']} last={item['last_seen']}"
        )

    print("\nFreshness")
    for item in report["freshness"]:
        print(
            f"  {item['source']}: last_seen={item['last_seen']} "
            f"age_minutes={item['age_minutes']} recent_rows={item['recent_rows']}"
        )

    print("\nTraining windows")
    for item in report["training_windows"]:
        print(
            f"  {item['entity_type']} {item['entity_id']}: rows={item['rows']} "
            f"trainable={item['trainable']} first={item['first_window']} last={item['last_window']}"
        )

    print("\nModels")
    for item in report["models"]:
        print(
            f"  {item['entity_type']} {item['metric_group']} {item['status']}: "
            f"models={item['models']} training_end={item['latest_training_end']}"
        )

    print("\nFeedback")
    for item in report["feedback"]:
        print(
            f"  detector={item['detector_name']} label={item['label']} "
            f"count={item['count']} with_ml_details={item['with_ml_details']}"
        )

    print("\nRecommendations")
    for item in report["recommendations"]:
        print(f"  [{item['level']}] {item['message']}")


def _table_counts(conn) -> dict[str, int]:
    tables = [
        "servers",
        "services",
        "applications",
        "server_metrics",
        "service_metrics",
        "server_metric_rollups_1m",
        "service_metric_rollups_5m",
        "ml_models",
        "anomalies",
        "anomaly_ml_details",
        "anomaly_feedback",
        "incidents",
    ]
    counts = {}
    for table in tables:
        row = conn.execute(f"SELECT COUNT(*)::int AS count FROM {table}").fetchone()
        counts[table] = int(row["count"])
    return counts


def _metric_ranges(conn) -> list[dict[str, Any]]:
    return conn.execute(
        """
        SELECT 'server_metrics' AS source, COUNT(*)::int AS rows,
               COUNT(DISTINCT server_id)::int AS entities,
               MIN(recorded_at) AS first_seen, MAX(recorded_at) AS last_seen
        FROM server_metrics
        UNION ALL
        SELECT 'service_metrics', COUNT(*)::int,
               COUNT(DISTINCT service_id)::int,
               MIN(recorded_at), MAX(recorded_at)
        FROM service_metrics
        UNION ALL
        SELECT 'server_rollups_1m', COUNT(*)::int,
               COUNT(DISTINCT server_id)::int,
               MIN(window_start), MAX(window_start)
        FROM server_metric_rollups_1m
        UNION ALL
        SELECT 'service_rollups_5m', COUNT(*)::int,
               COUNT(DISTINCT service_id)::int,
               MIN(window_start), MAX(window_start)
        FROM service_metric_rollups_5m
        ORDER BY source
        """
    ).fetchall()


def _entity_summary(conn) -> dict[str, Any]:
    return {
        "servers": conn.execute(
            "SELECT server_status, agent_status, COUNT(*)::int AS count FROM servers GROUP BY server_status, agent_status ORDER BY server_status, agent_status"
        ).fetchall(),
        "services": conn.execute(
            "SELECT status, COUNT(*)::int AS count FROM services GROUP BY status ORDER BY status"
        ).fetchall(),
    }


def _model_summary(conn) -> list[dict[str, Any]]:
    return conn.execute(
        """
        SELECT entity_type, metric_group, status, COUNT(*)::int AS models,
               MIN(training_start) AS first_training_start,
               MAX(training_end) AS latest_training_end,
               MAX(created_at) AS latest_created_at
        FROM ml_models
        GROUP BY entity_type, metric_group, status
        ORDER BY entity_type, metric_group, status
        """
    ).fetchall()


def _feedback_summary(conn) -> list[dict[str, Any]]:
    return conn.execute(
        """
        SELECT COALESCE(d.detector_name, 'manual') AS detector_name,
               COALESCE(f.label, 'unlabeled') AS label,
               COUNT(*)::int AS count,
               COUNT(d.anomaly_id)::int AS with_ml_details
        FROM anomalies a
        LEFT JOIN anomaly_ml_details d ON d.anomaly_id = a.anomaly_id
        LEFT JOIN anomaly_feedback f ON f.anomaly_id = a.anomaly_id
        GROUP BY COALESCE(d.detector_name, 'manual'), COALESCE(f.label, 'unlabeled')
        ORDER BY detector_name, label
        """
    ).fetchall()


def _training_windows(conn, *, training_days: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT 'server' AS entity_type, server_id AS entity_id,
               COUNT(*)::int AS rows,
               MIN(window_start) AS first_window,
               MAX(window_start) AS last_window
        FROM server_metric_rollups_1m
        WHERE window_start >= NOW() - (%s || ' days')::interval
        GROUP BY server_id
        UNION ALL
        SELECT 'service', service_id,
               COUNT(*)::int,
               MIN(window_start),
               MAX(window_start)
        FROM service_metric_rollups_5m
        WHERE window_start >= NOW() - (%s || ' days')::interval
        GROUP BY service_id
        ORDER BY entity_type, entity_id
        """,
        (training_days, training_days),
    ).fetchall()

    out = []
    for row in rows:
        item = dict(row)
        item["trainable"] = int(row["rows"]) >= settings.min_training_rows
        out.append(item)
    return out


def _freshness(conn, *, freshness_hours: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        WITH now_value AS (SELECT NOW() AS now)
        SELECT 'server_metrics' AS source,
               MAX(recorded_at) AS last_seen,
               ROUND(EXTRACT(EPOCH FROM ((SELECT now FROM now_value) - MAX(recorded_at))) / 60.0, 2) AS age_minutes,
               COUNT(*) FILTER (WHERE recorded_at >= (SELECT now FROM now_value) - (%s || ' hours')::interval)::int AS recent_rows
        FROM server_metrics
        UNION ALL
        SELECT 'service_metrics',
               MAX(recorded_at),
               ROUND(EXTRACT(EPOCH FROM ((SELECT now FROM now_value) - MAX(recorded_at))) / 60.0, 2),
               COUNT(*) FILTER (WHERE recorded_at >= (SELECT now FROM now_value) - (%s || ' hours')::interval)::int
        FROM service_metrics
        ORDER BY source
        """,
        (freshness_hours, freshness_hours),
    ).fetchall()
    return rows


def _recommendations(
    *,
    freshness: list[dict[str, Any]],
    model_summary: list[dict[str, Any]],
    feedback_summary: list[dict[str, Any]],
    training_windows: list[dict[str, Any]],
    freshness_hours: int,
    training_days: int,
) -> list[dict[str, str]]:
    recommendations: list[dict[str, str]] = []
    stale_sources = [item for item in freshness if int(item.get("recent_rows") or 0) == 0]
    if stale_sources:
        recommendations.append({
            "level": "blocker",
            "message": f"No metric rows in the last {freshness_hours} hours for: " + ", ".join(item["source"] for item in stale_sources),
        })

    active_models = [item for item in model_summary if item.get("status") == "active"]
    shadow_models = [item for item in model_summary if item.get("status") == "shadow"]
    if not active_models and shadow_models:
        recommendations.append({
            "level": "caution",
            "message": "Only shadow models exist. Keep incident automation conservative until fresh data and ML feedback are available.",
        })
    elif not active_models and not shadow_models:
        recommendations.append({"level": "blocker", "message": "No registered ML models found."})

    if not any(item.get("trainable") for item in training_windows):
        recommendations.append({
            "level": "blocker",
            "message": f"No entity has enough rollup rows in the last {training_days} days to retrain with current ML_MIN_TRAINING_ROWS.",
        })

    ml_feedback = [item for item in feedback_summary if int(item.get("with_ml_details") or 0) > 0]
    if not ml_feedback:
        recommendations.append({
            "level": "caution",
            "message": "Feedback exists only for manual/non-ML anomalies. Collect feedback on ML-created anomalies before tuning thresholds.",
        })

    if not recommendations:
        recommendations.append({"level": "ok", "message": "Database is ready for shadow scoring and evaluation."})
    return recommendations


def _json_default(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return str(value)


if __name__ == "__main__":
    main()
