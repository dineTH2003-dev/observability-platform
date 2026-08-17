from __future__ import annotations

import math

from app.detectors.types import Detection


def detect_server_hard_rules(row: dict) -> list[Detection]:
    detections: list[Detection] = []
    server_id = int(row["server_id"])
    hostname = row.get("hostname") or f"server {server_id}"
    window_start = row["window_start"].isoformat()
    window_end = row["window_end"].isoformat()

    rules = [
        ("CPU", "cpu_last", 95.0, "critical"),
        ("MEMORY", "memory_last", 95.0, "critical"),
        ("DISK", "disk_last", 90.0, "critical"),
    ]

    for anomaly_type, col, threshold, severity in rules:
        value = _number(row.get(col))
        if value is not None and value >= threshold:
            detections.append(
                Detection(
                    entity_type="server",
                    entity_id=server_id,
                    server_id=server_id,
                    service_id=None,
                    application_id=None,
                    anomaly_type=anomaly_type,
                    severity=severity,
                    detector_name="hard_rule",
                    metric_value=value,
                    threshold=threshold,
                    score=min(1.0, value / 100.0),
                    confidence=0.95,
                    window_start=window_start,
                    window_end=window_end,
                    title=f"{anomaly_type} danger threshold crossed on {hostname}",
                    description=f"{anomaly_type} is {value:.2f}, above the hard threshold of {threshold:.2f}.",
                    reason_codes=[f"{anomaly_type.lower()}_hard_threshold"],
                    feature_values=_feature_values(row),
                )
            )

    if int(row.get("missing_count") or 0) > 0:
        detections.append(
            Detection(
                entity_type="server",
                entity_id=server_id,
                server_id=server_id,
                service_id=None,
                application_id=None,
                anomaly_type="TELEMETRY",
                severity="medium",
                detector_name="hard_rule",
                metric_value=float(row.get("missing_count") or 0),
                threshold=0,
                score=0.65,
                confidence=0.8,
                window_start=window_start,
                window_end=window_end,
                title=f"Missing server metric samples on {hostname}",
                description="One or more expected server metric samples were missing in the scoring window.",
                reason_codes=["server_metric_missing"],
                feature_values=_feature_values(row),
                auto_create_incident=True,
            )
        )

    return detections


def detect_service_hard_rules(row: dict) -> list[Detection]:
    detections: list[Detection] = []
    service_id = int(row["service_id"])
    service_name = row.get("service_name") or f"service {service_id}"
    server_id = _int_or_none(row.get("server_id"))
    application_id = _int_or_none(row.get("application_id"))
    window_start = row["window_start"].isoformat()
    window_end = row["window_end"].isoformat()

    for anomaly_type, col, threshold in [("CPU", "cpu_last", 95.0), ("MEMORY", "memory_last", 95.0)]:
        value = _number(row.get(col))
        if value is not None and value >= threshold:
            detections.append(
                Detection(
                    entity_type="service",
                    entity_id=service_id,
                    server_id=server_id,
                    service_id=service_id,
                    application_id=application_id,
                    anomaly_type=anomaly_type,
                    severity="critical",
                    detector_name="hard_rule",
                    metric_value=value,
                    threshold=threshold,
                    score=min(1.0, value / 100.0),
                    confidence=0.95,
                    window_start=window_start,
                    window_end=window_end,
                    title=f"{anomaly_type} danger threshold crossed on {service_name}",
                    description=f"{anomaly_type} is {value:.2f}, above the hard threshold of {threshold:.2f}.",
                    reason_codes=[f"service_{anomaly_type.lower()}_hard_threshold"],
                    feature_values=_feature_values(row),
                )
            )

    return detections


def _number(value):
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(number) else number


def _int_or_none(value):
    number = _number(value)
    return int(number) if number is not None else None


def _feature_values(row: dict) -> dict:
    keys = [
        "cpu_last",
        "cpu_avg",
        "memory_last",
        "memory_avg",
        "disk_last",
        "disk_avg",
        "thread_count_last",
        "missing_count",
    ]
    return {key: _number(row.get(key)) for key in keys if key in row}
