from __future__ import annotations

import argparse

from app.config import settings
from app.db import get_conn
from app.detectors.isolation_forest import train_isolation_forest
from app.features.rollups import backfill_server_rollups, backfill_service_rollups
from app.features.server_features import SERVER_FEATURE_COLUMNS, build_server_features, load_server_rollups
from app.features.service_features import SERVICE_FEATURE_COLUMNS, build_service_features, load_service_rollups
from app.registry import register_model, save_artifact


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Isolation Forest anomaly models.")
    parser.add_argument("--entity-type", choices=["server", "service"], required=True)
    parser.add_argument("--days", type=int, default=14)
    parser.add_argument("--status", choices=["shadow", "active"], default="shadow")
    args = parser.parse_args()

    with get_conn() as conn:
        if args.entity_type == "server":
            backfill_server_rollups(conn, hours=args.days * 24)
            frame = build_server_features(load_server_rollups(conn, days=args.days))
            id_col = "server_id"
            feature_columns = SERVER_FEATURE_COLUMNS
            metric_group = "server_resource"
        else:
            backfill_service_rollups(conn, hours=args.days * 24)
            frame = build_service_features(load_service_rollups(conn, days=args.days))
            id_col = "service_id"
            feature_columns = SERVICE_FEATURE_COLUMNS
            metric_group = "service_resource"

        if frame.empty:
            print("No training data found.")
            return

        trained = 0
        skipped = 0
        for entity_id, group in frame.groupby(id_col):
            group = group.sort_values("window_start")
            trainable = group[feature_columns].dropna()
            if len(trainable) < settings.min_training_rows:
                skipped += 1
                continue

            model, thresholds = train_isolation_forest(group, feature_columns)
            artifact_uri = save_artifact(model, args.entity_type, int(entity_id), metric_group)
            model_id = register_model(
                conn,
                entity_type=args.entity_type,
                entity_id=int(entity_id),
                metric_group=metric_group,
                algorithm="isolation_forest",
                feature_schema=feature_columns,
                parameters={
                    "n_estimators": settings.isolation_estimators,
                    "contamination": settings.isolation_contamination,
                    "max_samples": "auto",
                    "random_state": 42,
                },
                thresholds=thresholds,
                artifact_uri=artifact_uri,
                training_start=group["window_start"].min().to_pydatetime(),
                training_end=group["window_start"].max().to_pydatetime(),
                status=args.status,
                metrics={
                    "training_rows": int(len(group)),
                    "feature_count": len(feature_columns),
                },
            )
            trained += 1
            print(f"trained entity_type={args.entity_type} entity_id={entity_id} model_id={model_id}")

        conn.commit()

    print(f"trained={trained}")
    print(f"skipped_insufficient_data={skipped}")


if __name__ == "__main__":
    main()
