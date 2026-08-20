"""
Unit Tests — app/detectors/ensemble.py

Tests the choose_best_detection() function that picks the
highest-priority detection from a list of candidates.
"""
import pytest
from datetime import datetime, timezone
from app.detectors.ensemble import choose_best_detection
from app.detectors.types import Detection


# ── Helper ────────────────────────────────────────────────────────────────────

def _make_detection(severity: str, score: float, confidence: float = 0.8) -> Detection:
    """Build a minimal Detection object for testing."""
    ts = datetime(2024, 8, 1, 10, 0, 0, tzinfo=timezone.utc).isoformat()
    return Detection(
        entity_type="server",
        entity_id=1,
        server_id=1,
        service_id=None,
        application_id=None,
        anomaly_type="CPU",
        severity=severity,
        detector_name="test",
        metric_value=90.0,
        threshold=95.0,
        score=score,
        confidence=confidence,
        window_start=ts,
        window_end=ts,
        title="Test Detection",
        description="A test detection.",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# choose_best_detection
# ═══════════════════════════════════════════════════════════════════════════════

class TestChooseBestDetection:

    def test_returns_none_for_empty_list(self):
        """Empty input → None (no detections to choose from)."""
        assert choose_best_detection([]) is None

    def test_returns_single_detection_as_is(self):
        """Single-item list → that detection is returned."""
        d = _make_detection("high", score=0.8)
        result = choose_best_detection([d])
        assert result is d

    def test_critical_beats_high(self):
        """critical severity must beat high severity."""
        high     = _make_detection("high",     score=0.9)
        critical = _make_detection("critical", score=0.5)
        result = choose_best_detection([high, critical])
        assert result.severity == "critical"

    def test_high_beats_medium(self):
        """high severity must beat medium severity."""
        medium = _make_detection("medium", score=0.9)
        high   = _make_detection("high",   score=0.5)
        result = choose_best_detection([medium, high])
        assert result.severity == "high"

    def test_medium_beats_low(self):
        """medium severity must beat low severity."""
        low    = _make_detection("low",    score=0.9)
        medium = _make_detection("medium", score=0.5)
        result = choose_best_detection([low, medium])
        assert result.severity == "medium"

    def test_higher_score_wins_same_severity(self):
        """When severity is equal, higher score wins."""
        d1 = _make_detection("high", score=0.6)
        d2 = _make_detection("high", score=0.9)
        result = choose_best_detection([d1, d2])
        assert result.score == 0.9

    def test_higher_confidence_wins_same_severity_and_score(self):
        """When severity and score are equal, higher confidence wins."""
        d1 = _make_detection("high", score=0.7, confidence=0.6)
        d2 = _make_detection("high", score=0.7, confidence=0.9)
        result = choose_best_detection([d1, d2])
        assert result.confidence == 0.9

    def test_severity_rank_full_order(self):
        """All four severities in mixed order — critical must win."""
        detections = [
            _make_detection("low",      score=1.0),
            _make_detection("critical", score=0.1),
            _make_detection("medium",   score=0.9),
            _make_detection("high",     score=0.8),
        ]
        result = choose_best_detection(detections)
        assert result.severity == "critical"

    def test_unknown_severity_gets_lowest_priority(self):
        """An unrecognised severity string gets rank 0 (lowest)."""
        d_unknown = _make_detection("unknown", score=1.0)
        d_low     = _make_detection("low",     score=0.1)
        result = choose_best_detection([d_unknown, d_low])
        # 'low' has rank 1, 'unknown' has rank 0 → 'low' wins
        assert result.severity == "low"

    def test_does_not_mutate_input_list(self):
        """Input list must not be modified (sorted should create a new list)."""
        detections = [
            _make_detection("high",   score=0.8),
            _make_detection("medium", score=0.9),
        ]
        original_order = [id(d) for d in detections]
        choose_best_detection(detections)
        assert [id(d) for d in detections] == original_order

    def test_works_with_large_list(self):
        """Stress test: 100 detections, the one critical must win."""
        detections = [_make_detection("medium", score=0.9) for _ in range(99)]
        detections.append(_make_detection("critical", score=0.1))
        result = choose_best_detection(detections)
        assert result.severity == "critical"
