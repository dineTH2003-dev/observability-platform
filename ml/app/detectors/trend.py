from __future__ import annotations

from app.detectors.types import Detection


def detect_server_trends(row: dict) -> list[Detection]:
    disk_delta = _number(row.get("disk_delta_30m"))
    disk_value = _number(row.get("disk_avg"))
    if disk_delta is None or disk_value is None:
        return []
    if disk_delta < 2.0 or disk_value < 75.0:
        return []

    server_id = int(row["server_id"])
    hostname = row.get("hostname") or f"server {server_id}"
    projected_hours = ((90.0 - disk_value) / max(disk_delta, 0.01)) * 0.5
    severity = "high" if projected_hours <= 6 else "medium"
    return [
        Detection(
            entity_type="server",
            entity_id=server_id,
            server_id=server_id,
            service_id=None,
            application_id=None,
            anomaly_type="DISK_TREND",
            severity=severity,
            detector_name="trend",
            metric_value=disk_value,
            threshold=90.0,
            score=min(1.0, disk_delta / 10.0),
            confidence=0.75,
            window_start=row["window_start"].isoformat(),
            window_end=row["window_end"].isoformat(),
            title=f"Disk usage is trending upward on {hostname}",
            description=(
                f"Disk usage increased by {disk_delta:.2f} percentage points in about 30 minutes. "
                f"Projected time to 90 percent is {projected_hours:.1f} hours."
            ),
            expected_value=None,
            lower_bound=None,
            upper_bound=90.0,
            reason_codes=["disk_growth_trend"],
            feature_values={
                "disk_avg": disk_value,
                "disk_delta_30m": disk_delta,
                "projected_hours_to_90": projected_hours,
            },
            auto_create_incident=severity == "high",
        )
    ]


def _number(value):
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
