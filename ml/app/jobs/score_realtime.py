from __future__ import annotations

import argparse
from collections import defaultdict
from typing import Any

import pandas as pd

from app.backend_client import BackendClient
from app.db import get_conn
from app.detectors.ensemble import choose_best_detection
from app.detectors.hard_rules import detect_server_hard_rules, detect_service_hard_rules
from app.detectors.isolation_forest import detect_with_isolation_model
from app.detectors.rolling_baseline import detect_server_rolling_baseline, detect_service_rolling_baseline
from app.detectors.telemetry import detect_stale_telemetry
from app.detectors.trend import detect_server_trends
from app.detectors.types import Detection
from app.features.rollups import backfill_server_rollups, backfill_service_rollups
from app.features.server_features import SERVER_FEATURE_COLUMNS, build_server_features, load_server_rollups
from app.features.service_features import SERVICE_FEATURE_COLUMNS, build_service_features, load_service_rollups
from app.registry import load_models


def main() -> None:
    parser = argparse.ArgumentParser(description="Score recent metric windows for anomalies.")
    parser.add_argument("--minutes", type=int, default=30)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-telemetry", action="store_true", help="Skip stale telemetry checks.")
    parser.add_argument("--server-stale-minutes", type=int, default=10)
    parser.add_argument("--service-stale-minutes", type=int, default=15)
    parser.add_argument("--max-telemetry-entities", type=int, default=100)
    args = parser.parse_args()

    result = score_once(
        minutes=args.minutes,
        dry_run=args.dry_run,
        include_telemetry=not args.no_telemetry,
        server_stale_minutes=args.server_stale_minutes,
        service_stale_minutes=args.service_stale_minutes,
        max_telemetry_entities=args.max_telemetry_entities,
        raise_post_errors=True,
    )

    print(f"posted={result['posted']}")
    print(f"dry_run={result['dry_run']}")
    print(f"post_errors={result['post_errors']}")
    print(f"by_detector={dict(result['by_detector'])}")


def score_once(
    *,
    minutes: int = 30,
    dry_run: bool = False,
    include_telemetry: bool = True,
    server_stale_minutes: int = 10,
    service_stale_minutes: int = 15,
    max_telemetry_entities: int = 100,
    client: BackendClient | None = None,
    raise_post_errors: bool = True,
) -> dict[str, Any]:
    client = client or BackendClient()
    result: dict[str, Any] = {
        "posted": 0,
        "dry_run": 0,
        "post_errors": 0,
        "by_detector": defaultdict(int),
    }

    telemetry_detections: list[Detection] = []
    with get_conn() as conn:
        backfill_server_rollups(conn, hours=max(1, minutes // 60 + 1))
        backfill_service_rollups(conn, hours=max(1, minutes // 60 + 1))
        conn.commit()

        server_models = load_models(conn, entity_type="server", metric_group="server_resource")
        service_models = load_models(conn, entity_type="service", metric_group="service_resource")

        server_features = build_server_features(load_server_rollups(conn, minutes=max(minutes, 180)))
        service_features = build_service_features(load_service_rollups(conn, minutes=max(minutes, 360)))

        if include_telemetry:
            telemetry_detections = detect_stale_telemetry(
                conn,
                server_stale_minutes=server_stale_minutes,
                service_stale_minutes=service_stale_minutes,
                max_entities=max_telemetry_entities,
            )

    for detection in telemetry_detections:
        _emit_detection(
            detection,
            client=client,
            dry_run=dry_run,
            result=result,
            raise_post_errors=raise_post_errors,
        )

    for row in _latest_rows(server_features, "server_id", minutes):
        detections = []
        row_dict = row.to_dict()
        detections.extend(detect_server_hard_rules(row_dict))
        detections.extend(detect_server_rolling_baseline(row_dict))
        detections.extend(detect_server_trends(row_dict))

        model_record = server_models.get(int(row_dict["server_id"]))
        if model_record:
            detection = detect_with_isolation_model(
                row_dict,
                model_record=model_record,
                feature_columns=SERVER_FEATURE_COLUMNS,
                entity_type="server",
            )
            if detection:
                detections.append(detection)

        best = choose_best_detection(detections)
        if best:
            _emit_detection(
                best,
                client=client,
                dry_run=dry_run,
                result=result,
                raise_post_errors=raise_post_errors,
            )

    for row in _latest_rows(service_features, "service_id", minutes):
        detections = []
        row_dict = row.to_dict()
        detections.extend(detect_service_hard_rules(row_dict))
        detections.extend(detect_service_rolling_baseline(row_dict))

        model_record = service_models.get(int(row_dict["service_id"]))
        if model_record:
            detection = detect_with_isolation_model(
                row_dict,
                model_record=model_record,
                feature_columns=SERVICE_FEATURE_COLUMNS,
                entity_type="service",
            )
            if detection:
                detections.append(detection)

        best = choose_best_detection(detections)
        if best:
            _emit_detection(
                best,
                client=client,
                dry_run=dry_run,
                result=result,
                raise_post_errors=raise_post_errors,
            )

    return result


def _emit_detection(
    detection: Detection,
    *,
    client: BackendClient,
    dry_run: bool,
    result: dict[str, Any],
    raise_post_errors: bool,
) -> None:
    result["by_detector"][detection.detector_name] += 1
    payload = detection.to_payload()
    if dry_run:
        result["dry_run"] += 1
        print(payload)
        return

    try:
        client.post_anomaly(payload)
        result["posted"] += 1
    except Exception:
        result["post_errors"] += 1
        if raise_post_errors:
            raise


def _latest_rows(frame, id_col: str, minutes: int):
    if frame.empty:
        return []

    max_time = frame["window_start"].max()
    recent = frame[frame["window_start"] >= max_time - pd.Timedelta(minutes=minutes)]
    if recent.empty:
        recent = frame
    return [row for _, row in recent.sort_values("window_start").groupby(id_col).tail(1).iterrows()]


if __name__ == "__main__":
    main()
