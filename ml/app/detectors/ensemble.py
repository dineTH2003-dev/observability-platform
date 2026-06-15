from __future__ import annotations

from app.detectors.types import Detection


def choose_best_detection(detections: list[Detection]) -> Detection | None:
    if not detections:
        return None

    severity_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    return sorted(
        detections,
        key=lambda d: (severity_rank.get(d.severity, 0), d.score, d.confidence),
        reverse=True,
    )[0]
