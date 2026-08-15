from __future__ import annotations

import math

from app.detectors.types import Detection


def detect_log_anomalies(row: dict) -> list[Detection]:
    # Skip if log config is not enabled for this service
    if not row.get("log_enabled"):
        return []

    service_id = int(row["service_id"])
    service_name = row.get("service_name") or f"service {service_id}"
    server_id = _int_or_none(row.get("server_id"))
    application_id = _int_or_none(row.get("application_id"))
    window_start = row["window_start"].isoformat()
    window_end = row["window_end"].isoformat()

    detections: list[Detection] = []

    # 1. Error Rate Anomaly
    error_rate_z = _number(row.get("error_rate_robust_z_1h"))
    error_rate = _number(row.get("error_rate"))
    error_count = int(row.get("error_count", 0))

    if error_rate_z is not None and error_rate_z >= 4.0 and error_count >= 5:
        severity = "high" if error_rate_z >= 8.0 else "medium"
        score = min(1.0, error_rate_z / 10.0)
        baseline = _number(row.get("error_rate_baseline_1h"))
        iqr = _number(row.get("error_rate_iqr_1h"))
        upper_bound = baseline + (4.0 * iqr) if baseline is not None and iqr is not None else None

        detections.append(
            Detection(
                entity_type="service",
                entity_id=service_id,
                server_id=server_id,
                service_id=service_id,
                application_id=application_id,
                anomaly_type="ERROR_RATE",
                severity=severity,
                detector_name="log_anomaly",
                metric_value=error_rate,
                threshold=upper_bound,
                score=score,
                confidence=min(0.95, 0.55 + score / 2),
                window_start=window_start,
                window_end=window_end,
                title=f"High Error Rate detected on {service_name}",
                description=f"Log error rate jumped to {error_rate:.2%} ({error_count} errors), far above normal baseline.",
                expected_value=baseline,
                lower_bound=None,
                upper_bound=upper_bound,
                reason_codes=["log_error_rate_spike"],
                feature_values={
                    "error_count": error_count,
                    "total_count": int(row.get("total_count", 0)),
                    "error_rate": error_rate,
                    "error_rate_robust_z_1h": error_rate_z,
                },
                auto_create_incident=severity == "high",
            )
        )

    # 2. Unusual Log Volume (sudden drop or spike)
    volume_z = _number(row.get("volume_robust_z_1h"))
    volume = int(row.get("total_count", 0))
    volume_baseline = _number(row.get("volume_baseline_1h"))
    volume_iqr = _number(row.get("volume_iqr_1h"))

    if volume_z is not None and abs(volume_z) >= 5.0 and volume_baseline is not None and volume_baseline > 20:
        is_drop = volume_z < 0
        severity = "medium"
        score = min(1.0, abs(volume_z) / 10.0)
        
        lower_bound = max(0, volume_baseline - (4.0 * volume_iqr))
        upper_bound = volume_baseline + (4.0 * volume_iqr)

        if is_drop and volume == 0:
             severity = "high" # complete silence is highly anomalous if baseline > 20
        
        detections.append(
            Detection(
                entity_type="service",
                entity_id=service_id,
                server_id=server_id,
                service_id=service_id,
                application_id=application_id,
                anomaly_type="LOG_VOLUME",
                severity=severity,
                detector_name="log_anomaly",
                metric_value=volume,
                threshold=lower_bound if is_drop else upper_bound,
                score=score,
                confidence=min(0.9, 0.5 + score / 2),
                window_start=window_start,
                window_end=window_end,
                title=f"Unusual Log Volume on {service_name}",
                description=f"Log volume {'dropped' if is_drop else 'spiked'} to {volume} lines/5m (baseline: {volume_baseline:.0f}).",
                expected_value=volume_baseline,
                lower_bound=lower_bound,
                upper_bound=upper_bound,
                reason_codes=["log_volume_drop" if is_drop else "log_volume_spike"],
                feature_values={
                    "total_count": volume,
                    "volume_baseline_1h": volume_baseline,
                    "volume_robust_z_1h": volume_z,
                },
                auto_create_incident=severity == "high",
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
