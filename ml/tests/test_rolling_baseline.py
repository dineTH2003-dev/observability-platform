"""
Unit Tests — app/detectors/rolling_baseline.py

Tests the rolling-baseline (robust z-score) anomaly detection logic.
No database needed — we pass plain dicts simulating rollup rows.
"""
import pytest
from datetime import datetime, timezone
from app.detectors.rolling_baseline import (
    detect_server_rolling_baseline,
    detect_service_rolling_baseline,
    _number,
    _int_or_none,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _window():
    start = datetime(2024, 8, 1, 10, 0, 0, tzinfo=timezone.utc)
    end   = datetime(2024, 8, 1, 10, 1, 0, tzinfo=timezone.utc)
    return start, end


def _server_row(**overrides) -> dict:
    """Build a minimal server rollup row with safe defaults (z < 4, no detection)."""
    start, end = _window()
    base = {
        "server_id":              1,
        "hostname":               "web-01",
        "window_start":           start,
        "window_end":             end,
        # CPU — normal z-score
        "cpu_avg":                55.0,
        "cpu_baseline_1h":        54.0,
        "cpu_iqr_1h":             3.0,
        "cpu_robust_z_1h":        0.33,   # well below z=4 threshold
        # Memory — normal
        "memory_avg":             60.0,
        "memory_baseline_1h":     59.0,
        "memory_iqr_1h":          4.0,
        "memory_robust_z_1h":     0.25,
        # Disk — normal
        "disk_avg":               45.0,
        "disk_baseline_1h":       44.0,
        "disk_iqr_1h":            2.0,
        "disk_robust_z_1h":       0.5,
        # Thread count — normal
        "thread_count_avg":       100.0,
        "thread_count_baseline_1h": 98.0,
        "thread_count_iqr_1h":    5.0,
        "thread_count_robust_z_1h": 0.4,
    }
    base.update(overrides)
    return base


def _service_row(**overrides) -> dict:
    """Build a minimal service rollup row with safe defaults."""
    start, end = _window()
    base = {
        "service_id":         1,
        "service_name":       "api-gateway",
        "server_id":          2,
        "application_id":     3,
        "window_start":       start,
        "window_end":         end,
        "cpu_avg":            55.0,
        "cpu_baseline_1h":    54.0,
        "cpu_iqr_1h":         3.0,
        "cpu_robust_z_1h":    0.33,
        "memory_avg":         60.0,
        "memory_baseline_1h": 59.0,
        "memory_iqr_1h":      4.0,
        "memory_robust_z_1h": 0.25,
    }
    base.update(overrides)
    return base


# ═══════════════════════════════════════════════════════════════════════════════
# detect_server_rolling_baseline
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectServerRollingBaseline:

    def test_no_detection_when_z_below_threshold(self):
        """All z-scores well below 4.0 — no detections expected."""
        result = detect_server_rolling_baseline(_server_row())
        assert result == []

    def test_cpu_spike_with_high_z_triggers_detection(self):
        """CPU z-score of 5.0 (>= 4.0) must trigger a CPU detection."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=5.0))
        cpu_d = [d for d in result if d.anomaly_type == "CPU"]
        assert len(cpu_d) == 1
        assert cpu_d[0].detector_name == "rolling_baseline"

    def test_severity_is_medium_for_z_between_4_and_8(self):
        """z=5.0 (between 4 and 8) → severity must be 'medium'."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=5.0))
        cpu_d = next(d for d in result if d.anomaly_type == "CPU")
        assert cpu_d.severity == "medium"

    def test_severity_is_high_for_z_8_or_above(self):
        """z=8.0 or higher → severity must be 'high'."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=8.0))
        cpu_d = next(d for d in result if d.anomaly_type == "CPU")
        assert cpu_d.severity == "high"

    def test_z_exactly_at_boundary_4_triggers(self):
        """z=4.0 exactly (at boundary) must trigger because condition is z < 4.0 (skip)."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=4.0))
        cpu_d = [d for d in result if d.anomaly_type == "CPU"]
        assert len(cpu_d) == 1

    def test_z_just_below_4_does_not_trigger(self):
        """z=3.99 must NOT trigger (strictly less than 4.0 is skipped)."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=3.99))
        cpu_d = [d for d in result if d.anomaly_type == "CPU"]
        assert cpu_d == []

    def test_score_is_capped_at_1(self):
        """score = min(1.0, z/10) — at z=15 score must be 1.0."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=15.0))
        cpu_d = next(d for d in result if d.anomaly_type == "CPU")
        assert cpu_d.score == 1.0

    def test_score_is_proportional_to_z(self):
        """score = z/10 when z <= 10. At z=6.0 score should be 0.6."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=6.0))
        cpu_d = next(d for d in result if d.anomaly_type == "CPU")
        assert abs(cpu_d.score - 0.6) < 0.001

    def test_memory_spike_triggers_detection(self):
        """High memory z-score must produce a MEMORY detection."""
        result = detect_server_rolling_baseline(_server_row(memory_robust_z_1h=6.0))
        mem_d = [d for d in result if d.anomaly_type == "MEMORY"]
        assert len(mem_d) == 1

    def test_disk_spike_triggers_detection(self):
        """High disk z-score must produce a DISK detection."""
        result = detect_server_rolling_baseline(_server_row(disk_robust_z_1h=5.5))
        disk_d = [d for d in result if d.anomaly_type == "DISK"]
        assert len(disk_d) == 1

    def test_thread_count_spike_triggers_detection(self):
        """High thread-count z-score must produce a THREAD_COUNT detection."""
        result = detect_server_rolling_baseline(_server_row(thread_count_robust_z_1h=7.0))
        thread_d = [d for d in result if d.anomaly_type == "THREAD_COUNT"]
        assert len(thread_d) == 1

    def test_detection_skipped_when_z_is_none(self):
        """If z-score is None (not computed yet), that metric is skipped."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=None))
        cpu_d = [d for d in result if d.anomaly_type == "CPU"]
        assert cpu_d == []

    def test_detection_skipped_when_baseline_is_none(self):
        """If baseline is None (not enough data), that metric is skipped."""
        result = detect_server_rolling_baseline(_server_row(
            cpu_robust_z_1h=5.0,
            cpu_baseline_1h=None,
        ))
        cpu_d = [d for d in result if d.anomaly_type == "CPU"]
        assert cpu_d == []

    def test_detection_has_correct_entity_fields(self):
        """Detection entity fields must match the server row."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=5.0))
        d = result[0]
        assert d.entity_type == "server"
        assert d.entity_id   == 1
        assert d.server_id   == 1
        assert d.service_id  is None

    def test_upper_bound_calculated_correctly(self):
        """upper_bound = baseline + (4 * iqr). With baseline=54, iqr=3 → 54 + 12 = 66."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=5.0))
        cpu_d = next(d for d in result if d.anomaly_type == "CPU")
        assert abs(cpu_d.upper_bound - 66.0) < 0.001   # 54 + (4 * 3) = 66

    def test_expected_value_equals_baseline(self):
        """expected_value should be the rolling baseline value."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=5.0))
        cpu_d = next(d for d in result if d.anomaly_type == "CPU")
        assert cpu_d.expected_value == 54.0

    def test_auto_create_incident_is_true(self):
        """Rolling baseline detections should always set auto_create_incident=True."""
        result = detect_server_rolling_baseline(_server_row(cpu_robust_z_1h=5.0))
        assert result[0].auto_create_incident is True

    def test_hostname_in_title(self):
        """Title must include the hostname."""
        result = detect_server_rolling_baseline(_server_row(
            cpu_robust_z_1h=5.0, hostname="prod-api-01"
        ))
        assert "prod-api-01" in result[0].title


# ═══════════════════════════════════════════════════════════════════════════════
# detect_service_rolling_baseline
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectServiceRollingBaseline:

    def test_no_detection_when_z_below_threshold(self):
        """Normal z-scores — no detection."""
        result = detect_service_rolling_baseline(_service_row())
        assert result == []

    def test_cpu_spike_triggers_for_service(self):
        """High CPU z-score on a service must return a CPU detection."""
        result = detect_service_rolling_baseline(_service_row(cpu_robust_z_1h=5.0))
        cpu_d = [d for d in result if d.anomaly_type == "CPU"]
        assert len(cpu_d) == 1
        assert cpu_d[0].entity_type == "service"
        assert cpu_d[0].service_id  == 1

    def test_memory_spike_triggers_for_service(self):
        """High memory z-score on a service must return a MEMORY detection."""
        result = detect_service_rolling_baseline(_service_row(memory_robust_z_1h=6.0))
        mem_d = [d for d in result if d.anomaly_type == "MEMORY"]
        assert len(mem_d) == 1

    def test_service_name_in_title(self):
        """Detection title must contain the service name."""
        result = detect_service_rolling_baseline(_service_row(
            cpu_robust_z_1h=5.0, service_name="checkout-service"
        ))
        assert "checkout-service" in result[0].title


# ═══════════════════════════════════════════════════════════════════════════════
# Helper functions
# ═══════════════════════════════════════════════════════════════════════════════

class TestRollingBaselineHelpers:

    def test_number_none_returns_none(self):
        from app.detectors.rolling_baseline import _number
        assert _number(None) is None

    def test_number_valid_float(self):
        from app.detectors.rolling_baseline import _number
        assert _number("3.14") == 3.14

    def test_number_nan_returns_none(self):
        import math
        from app.detectors.rolling_baseline import _number
        assert _number(math.nan) is None

    def test_int_or_none_converts(self):
        assert _int_or_none("7") == 7

    def test_int_or_none_with_none(self):
        assert _int_or_none(None) is None
