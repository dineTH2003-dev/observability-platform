from __future__ import annotations

import math

from app.detectors.types import Detection


def detect_server_rolling_baseline(row: dict) -> list[Detection]:
    server_id = int(row["server_id"])
    hostname = row.get("hostname") or f"server {server_id}"
    return _detect_rolling(
        row=row,
        entity_type="server",
        entity_id=server_id,
        server_id=server_id,
        service_id=None,
        application_id=None,
        name=hostname,
        metric_specs=[
            ("CPU", "cpu_avg", "cpu_baseline_1h", "cpu_iqr_1h", "cpu_robust_z_1h"),
            ("MEMORY", "memory_avg", "memory_baseline_1h", "memory_iqr_1h", "memory_robust_z_1h"),
            ("DISK", "disk_avg", "disk_baseline_1h", "disk_iqr_1h", "disk_robust_z_1h"),
            ("THREAD_COUNT", "thread_count_avg", "thread_count_baseline_1h", "thread_count_iqr_1h", "thread_count_robust_z_1h"),
        ],
    )


def detect_service_rolling_baseline(row: dict) -> list[Detection]:
    service_id = int(row["service_id"])
    service_name = row.get("service_name") or f"service {service_id}"
    server_id = _int_or_none(row.get("server_id"))
    application_id = _int_or_none(row.get("application_id"))
    return _detect_rolling(
        row=row,
        entity_type="service",
        entity_id=service_id,
        server_id=server_id,
        service_id=service_id,
        application_id=application_id,
        name=service_name,
        metric_specs=[
            ("CPU", "cpu_avg", "cpu_baseline_1h", "cpu_iqr_1h", "cpu_robust_z_1h"),
            ("MEMORY", "memory_avg", "memory_baseline_1h", "memory_iqr_1h", "memory_robust_z_1h"),
        ],
    )


def _detect_rolling(
    *,
    row: dict,
    entity_type: str,
    entity_id: int,
    server_id: int | None,
    service_id: int | None,
    application_id: int | None,
    name: str,
    metric_specs: list[tuple[str, str, str, str, str]],
) -> list[Detection]:
    detections: list[Detection] = []
    window_start = row["window_start"].isoformat()
    window_end = row["window_end"].isoformat()

    for anomaly_type, value_col, baseline_col, iqr_col, z_col in metric_specs:
        z = _number(row.get(z_col))
        value = _number(row.get(value_col))
        baseline = _number(row.get(baseline_col))
        iqr = _number(row.get(iqr_col))

        if z is None or value is None or baseline is None or iqr is None:
            continue
        if z < 4.0:
            continue

        severity = "high" if z >= 8.0 else "medium"
        upper_bound = baseline + (4.0 * iqr)
        score = min(1.0, z / 10.0)
        detections.append(
            Detection(
                entity_type=entity_type,
                entity_id=entity_id,
                server_id=server_id,
                service_id=service_id,
                application_id=application_id,
                anomaly_type=anomaly_type,
                severity=severity,
                detector_name="rolling_baseline",
                metric_value=value,
                threshold=upper_bound,
                score=score,
                confidence=min(0.95, 0.55 + score / 2),
                window_start=window_start,
                window_end=window_end,
                title=f"Unusual {anomaly_type.lower()} usage on {name}",
                description=(
                    f"{anomaly_type} value {value:.2f} is far above the learned one-hour "
                    f"baseline {baseline:.2f}; robust z-score={z:.2f}."
                ),
                expected_value=baseline,
                lower_bound=max(0.0, baseline - (4.0 * iqr)),
                upper_bound=upper_bound,
                reason_codes=[f"{anomaly_type.lower()}_high_vs_rolling_baseline"],
                feature_values={key: _json_number(row.get(key)) for key in row.keys() if key.endswith("_1h") or key in [value_col]},
                auto_create_incident=True,
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


def _json_number(value):
    parsed = _number(value)
    return parsed if parsed is not None else value
