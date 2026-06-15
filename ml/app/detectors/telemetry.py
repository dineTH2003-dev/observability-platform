from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.detectors.types import Detection

PRODUCTION_ENVIRONMENTS = {"prod", "production", "live"}
SEVERITY_RANK = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def detect_stale_telemetry(
    conn,
    *,
    server_stale_minutes: int = 10,
    service_stale_minutes: int = 15,
    max_entities: int = 100,
) -> list[Detection]:
    """Detect entity telemetry gaps from persisted database state.

    This detector intentionally uses latest raw metric timestamps and entity state,
    not rollup rows. That keeps it useful before realtime ingestion is finished and
    also catches full telemetry silence, where no new rollup window can be created.
    """
    now = conn.execute("SELECT NOW() AS now").fetchone()["now"]
    detections = []
    detections.extend(_detect_server_staleness(conn, now, server_stale_minutes))
    detections.extend(_detect_service_staleness(conn, now, service_stale_minutes))
    detections.sort(key=lambda d: (SEVERITY_RANK.get(d.severity, 0), d.metric_value or 0), reverse=True)
    return detections[:max_entities]


def _detect_server_staleness(conn, now: datetime, stale_minutes: int) -> list[Detection]:
    rows = conn.execute(
        """
        SELECT
          s.server_id,
          s.hostname,
          s.environment,
          s.agent_status,
          s.server_status,
          s.last_discovered_at,
          lm.last_metric_at
        FROM servers s
        LEFT JOIN (
          SELECT server_id, MAX(recorded_at) AS last_metric_at
          FROM server_metrics
          GROUP BY server_id
        ) lm ON lm.server_id = s.server_id
        ORDER BY s.server_id
        """
    ).fetchall()

    detections: list[Detection] = []
    for row in rows:
        last_metric_at = row.get("last_metric_at")
        last_discovered_at = row.get("last_discovered_at")
        metric_age = _age_minutes(now, last_metric_at)
        heartbeat_age = _age_minutes(now, last_discovered_at)
        agent_status = str(row.get("agent_status") or "UNKNOWN")

        reasons: list[str] = []
        stale_since = last_metric_at or last_discovered_at
        age_value = metric_age if metric_age is not None else heartbeat_age

        if metric_age is None:
            reasons.append("server_metric_never_seen")
        elif metric_age >= stale_minutes:
            reasons.append("server_metric_stale")

        if agent_status != "ACTIVE":
            reasons.append("agent_not_active")
        elif heartbeat_age is not None and heartbeat_age >= stale_minutes:
            reasons.append("agent_heartbeat_stale")

        if not reasons:
            continue

        server_id = int(row["server_id"])
        hostname = row.get("hostname") or f"server {server_id}"
        severity = _telemetry_severity(row.get("environment"), age_value)
        stale_label = _fingerprint_time(stale_since)
        detections.append(
            Detection(
                entity_type="server",
                entity_id=server_id,
                server_id=server_id,
                service_id=None,
                application_id=None,
                anomaly_type="TELEMETRY",
                severity=severity,
                detector_name="telemetry_gap",
                metric_value=age_value,
                threshold=float(stale_minutes),
                score=_score_from_age(age_value, stale_minutes),
                confidence=0.9,
                window_start=_iso(now),
                window_end=_iso(now),
                title=f"Server telemetry stale on {hostname}",
                description=(
                    f"No fresh server metric data is available for {hostname}. "
                    f"Latest metric age is {_format_age(metric_age)}; agent status is {agent_status}."
                ),
                reason_codes=reasons,
                feature_values={
                    "agent_status": agent_status,
                    "server_status": row.get("server_status"),
                    "environment": row.get("environment"),
                    "last_metric_at": _iso_or_none(last_metric_at),
                    "last_discovered_at": _iso_or_none(last_discovered_at),
                    "metric_age_minutes": metric_age,
                    "heartbeat_age_minutes": heartbeat_age,
                },
                auto_create_incident=False,
                fingerprint=f"telemetry_gap:server:{server_id}:last_seen:{stale_label}",
            )
        )
    return detections


def _detect_service_staleness(conn, now: datetime, stale_minutes: int) -> list[Detection]:
    rows = conn.execute(
        """
        SELECT
          svc.service_id,
          svc.server_id,
          svc.application_id,
          svc.name AS service_name,
          svc.status AS service_status,
          svc.updated_at,
          srv.hostname,
          srv.environment,
          lm.last_metric_at
        FROM services svc
        JOIN servers srv ON srv.server_id = svc.server_id
        LEFT JOIN (
          SELECT service_id, MAX(recorded_at) AS last_metric_at
          FROM service_metrics
          GROUP BY service_id
        ) lm ON lm.service_id = svc.service_id
        ORDER BY svc.service_id
        """
    ).fetchall()

    detections: list[Detection] = []
    for row in rows:
        service_status = str(row.get("service_status") or "UNKNOWN")
        last_metric_at = row.get("last_metric_at")
        updated_at = row.get("updated_at")
        metric_age = _age_minutes(now, last_metric_at)
        state_age = _age_minutes(now, updated_at)
        age_value = metric_age if metric_age is not None else state_age

        reasons: list[str] = []
        if metric_age is None:
            reasons.append("service_metric_never_seen")
        elif metric_age >= stale_minutes:
            reasons.append("service_metric_stale")
        if service_status != "RUNNING":
            reasons.append("service_not_running")

        if not reasons:
            continue

        service_id = int(row["service_id"])
        server_id = int(row["server_id"])
        application_id = _int_or_none(row.get("application_id"))
        service_name = row.get("service_name") or f"service {service_id}"
        server_name = row.get("hostname") or f"server {server_id}"
        severity = _telemetry_severity(row.get("environment"), age_value)
        stale_label = _fingerprint_time(last_metric_at or updated_at)
        detections.append(
            Detection(
                entity_type="service",
                entity_id=service_id,
                server_id=server_id,
                service_id=service_id,
                application_id=application_id,
                anomaly_type="TELEMETRY",
                severity=severity,
                detector_name="telemetry_gap",
                metric_value=age_value,
                threshold=float(stale_minutes),
                score=_score_from_age(age_value, stale_minutes),
                confidence=0.85,
                window_start=_iso(now),
                window_end=_iso(now),
                title=f"Service telemetry stale for {service_name}",
                description=(
                    f"No fresh service metric data is available for {service_name} on {server_name}. "
                    f"Latest metric age is {_format_age(metric_age)}; service status is {service_status}."
                ),
                reason_codes=reasons,
                feature_values={
                    "service_status": service_status,
                    "environment": row.get("environment"),
                    "last_metric_at": _iso_or_none(last_metric_at),
                    "service_updated_at": _iso_or_none(updated_at),
                    "metric_age_minutes": metric_age,
                    "state_age_minutes": state_age,
                },
                auto_create_incident=False,
                fingerprint=f"telemetry_gap:service:{service_id}:last_seen:{stale_label}:status:{service_status}",
            )
        )
    return detections


def _telemetry_severity(environment: Any, age_minutes: float | None) -> str:
    env = str(environment or "").strip().lower()
    if env in PRODUCTION_ENVIRONMENTS:
        if age_minutes is not None and age_minutes >= 60:
            return "critical"
        return "high"
    if age_minutes is not None and age_minutes >= 60 * 24:
        return "medium"
    return "low"


def _score_from_age(age_minutes: float | None, threshold_minutes: int) -> float:
    if age_minutes is None:
        return 0.7
    return min(1.0, max(0.5, age_minutes / max(threshold_minutes * 10, 1)))


def _age_minutes(now: datetime, value: datetime | None) -> float | None:
    if value is None:
        return None
    return round(max(0.0, (now - value).total_seconds() / 60.0), 2)


def _format_age(age_minutes: float | None) -> str:
    if age_minutes is None:
        return "never"
    if age_minutes < 60:
        return f"{age_minutes:.1f} minutes"
    if age_minutes < 60 * 24:
        return f"{age_minutes / 60:.1f} hours"
    return f"{age_minutes / (60 * 24):.1f} days"


def _fingerprint_time(value: datetime | None) -> str:
    if value is None:
        return "never"
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat()


def _iso(value: datetime) -> str:
    return value.isoformat()


def _iso_or_none(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _int_or_none(value) -> int | None:
    if value is None:
        return None
    return int(value)
