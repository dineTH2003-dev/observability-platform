from __future__ import annotations

import argparse

from app.db import get_conn


POSITIVE_LABELS = {"true_positive"}
NEGATIVE_LABELS = {"false_positive", "duplicate"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarize anomaly feedback for model evaluation.")
    parser.add_argument("--days", type=int, default=30)
    args = parser.parse_args()

    with get_conn() as conn:
        label_rows = conn.execute(
            """
            SELECT
              COALESCE(d.detector_name, 'manual') AS detector_name,
              COALESCE(f.label, 'unlabeled') AS label,
              COUNT(*)::int AS count,
              COUNT(d.anomaly_id)::int AS with_ml_details
            FROM anomalies a
            LEFT JOIN anomaly_ml_details d ON d.anomaly_id = a.anomaly_id
            LEFT JOIN anomaly_feedback f ON f.anomaly_id = a.anomaly_id
            WHERE a.detected_at >= NOW() - (%s || ' days')::INTERVAL
            GROUP BY COALESCE(d.detector_name, 'manual'), COALESCE(f.label, 'unlabeled')
            ORDER BY detector_name, label
            """,
            (args.days,),
        ).fetchall()

        quality_rows = conn.execute(
            """
            SELECT
              d.detector_name,
              COUNT(*)::int AS labeled_count,
              COUNT(*) FILTER (WHERE f.label = 'true_positive')::int AS true_positive_count,
              COUNT(*) FILTER (WHERE f.label IN ('false_positive', 'duplicate'))::int AS negative_count,
              ROUND(
                COUNT(*) FILTER (WHERE f.label = 'true_positive')::numeric
                / NULLIF(COUNT(*) FILTER (WHERE f.label IN ('true_positive', 'false_positive', 'duplicate')), 0),
                4
              ) AS reviewed_precision
            FROM anomaly_feedback f
            JOIN anomaly_ml_details d ON d.anomaly_id = f.anomaly_id
            JOIN anomalies a ON a.anomaly_id = f.anomaly_id
            WHERE a.detected_at >= NOW() - (%s || ' days')::INTERVAL
              AND f.label IN ('true_positive', 'false_positive', 'duplicate')
            GROUP BY d.detector_name
            ORDER BY d.detector_name
            """,
            (args.days,),
        ).fetchall()

    print("label_counts")
    for row in label_rows:
        print(f"{row['detector_name']}	{row['label']}	{row['count']}	with_ml_details={row['with_ml_details']}")

    print("quality_by_detector")
    if not quality_rows:
        print("no_ml_feedback_available")
    for row in quality_rows:
        print(
            f"{row['detector_name']}	"
            f"labeled={row['labeled_count']}	"
            f"true_positive={row['true_positive_count']}	"
            f"negative={row['negative_count']}	"
            f"reviewed_precision={row['reviewed_precision']}"
        )


if __name__ == "__main__":
    main()
