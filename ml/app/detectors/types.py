from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Detection:
    entity_type: str
    entity_id: int
    server_id: int | None
    service_id: int | None
    application_id: int | None
    anomaly_type: str
    severity: str
    detector_name: str
    metric_value: float | None
    threshold: float | None
    score: float
    confidence: float
    window_start: str
    window_end: str
    title: str
    description: str
    expected_value: float | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None
    reason_codes: list[str] = field(default_factory=list)
    feature_values: dict = field(default_factory=dict)
    model_id: str | None = None
    auto_create_incident: bool | None = None
    fingerprint: str | None = None

    def to_payload(self) -> dict:
        payload = {
            "entity_type": self.entity_type,
            "server_id": self.server_id,
            "service_id": self.service_id,
            "application_id": self.application_id,
            "anomaly_type": self.anomaly_type,
            "severity": self.severity,
            "detector_name": self.detector_name,
            "metric_value": self.metric_value,
            "threshold": self.threshold,
            "score": self.score,
            "confidence": self.confidence,
            "window_start": self.window_start,
            "window_end": self.window_end,
            "title": self.title,
            "description": self.description,
            "expected_value": self.expected_value,
            "lower_bound": self.lower_bound,
            "upper_bound": self.upper_bound,
            "reason_codes": self.reason_codes,
            "feature_values": self.feature_values,
            "model_id": self.model_id,
            "auto_create_incident": self.auto_create_incident,
        }
        if self.fingerprint:
            payload["fingerprint"] = self.fingerprint
        return payload
