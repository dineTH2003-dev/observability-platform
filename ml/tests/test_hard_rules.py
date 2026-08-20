"""
Unit Tests — app/detectors/hard_rules.py

Tests the hard-threshold detection logic for servers and services.
No database is needed — we pass plain dicts that simulate rollup rows.
"""
import pytest
from datetime import datetime, timezone
from app.detectors.hard_rules import (
    detect_server_hard_rules,
    detect_service_hard_rules,
    _number,
    _int_or_none,
)


# ── Shared helpers ─────────────────────────────────────────────────────────────

def _window():
    """Return a fake (window_start, window_end) pair as datetime objects."""
    start = datetime(2024, 8, 1, 10, 0, 0, tzinfo=timezone.utc)
    end   = datetime(2024, 8, 1, 10, 1, 0, tzinfo=timezone.utc)
    return start, end


def _server_row(**overrides) -> dict:
    """Build a minimal server rollup row. Override any field as needed."""
    start, end = _window()
    base = {
        "server_id":    1,
        "hostname":     "web-01",
        "window_start": start,
        "window_end":   end,
        "cpu_last":     50.0,
        "memory_last":  60.0,
        "disk_last":    55.0,
        "missing_count": 0,
    }
    base.update(overrides)
    return base


def _service_row(**overrides) -> dict:
    """Build a minimal service rollup row. Override any field as needed."""
    start, end = _window()
    base = {
        "service_id":      1,
        "service_name":    "api-gateway",
        "server_id":       2,
        "application_id":  3,
        "window_start":    start,
        "window_end":      end,
        "cpu_last":        50.0,
        "memory_last":     60.0,
    }
    base.update(overrides)
    return base


# ═══════════════════════════════════════════════════════════════════════════════
# detect_server_hard_rules
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectServerHardRules:

    def test_no_detections_when_all_metrics_normal(self):
        """CPU 50%, Memory 60%, Disk 55% — all under thresholds — no anomaly."""
        result = detect_server_hard_rules(_server_row())
        assert result == []

    # ── CPU ──────────────────────────────────────────────────────────────────

    def test_cpu_at_threshold_triggers_critical(self):
        """cpu_last == 95.0 (exactly at threshold) must trigger critical."""
        result = detect_server_hard_rules(_server_row(cpu_last=95.0))
        cpu_detections = [d for d in result if d.anomaly_type == "CPU"]
        assert len(cpu_detections) == 1
        assert cpu_detections[0].severity == "critical"
        assert cpu_detections[0].detector_name == "hard_rule"

    def test_cpu_above_threshold_triggers_detection(self):
        """cpu_last == 99.5 is above 95.0 — must trigger."""
        result = detect_server_hard_rules(_server_row(cpu_last=99.5))
        cpu_detections = [d for d in result if d.anomaly_type == "CPU"]
        assert len(cpu_detections) == 1

    def test_cpu_below_threshold_no_detection(self):
        """cpu_last == 94.9 is just below 95.0 — must NOT trigger."""
        result = detect_server_hard_rules(_server_row(cpu_last=94.9))
        cpu_detections = [d for d in result if d.anomaly_type == "CPU"]
        assert cpu_detections == []

    # ── Memory ───────────────────────────────────────────────────────────────

    def test_memory_at_threshold_triggers_critical(self):
        """memory_last == 95.0 must trigger a MEMORY critical detection."""
        result = detect_server_hard_rules(_server_row(memory_last=95.0))
        mem_detections = [d for d in result if d.anomaly_type == "MEMORY"]
        assert len(mem_detections) == 1
        assert mem_detections[0].severity == "critical"

    def test_memory_below_threshold_no_detection(self):
        """memory_last == 90.0 — well below 95.0 — no detection."""
        result = detect_server_hard_rules(_server_row(memory_last=90.0))
        mem_detections = [d for d in result if d.anomaly_type == "MEMORY"]
        assert mem_detections == []

    # ── Disk ─────────────────────────────────────────────────────────────────

    def test_disk_at_threshold_triggers_critical(self):
        """disk_last == 90.0 must trigger (disk threshold is 90, lower than CPU/Mem)."""
        result = detect_server_hard_rules(_server_row(disk_last=90.0))
        disk_detections = [d for d in result if d.anomaly_type == "DISK"]
        assert len(disk_detections) == 1
        assert disk_detections[0].severity == "critical"

    def test_disk_below_threshold_no_detection(self):
        """disk_last == 89.9 — just under 90.0 — no detection."""
        result = detect_server_hard_rules(_server_row(disk_last=89.9))
        disk_detections = [d for d in result if d.anomaly_type == "DISK"]
        assert disk_detections == []

    # ── Multiple ─────────────────────────────────────────────────────────────

    def test_all_three_breach_simultaneously(self):
        """All three metrics above threshold — must return 3 separate detections."""
        result = detect_server_hard_rules(_server_row(
            cpu_last=99.0,
            memory_last=96.0,
            disk_last=92.0,
        ))
        types = {d.anomaly_type for d in result}
        assert "CPU"    in types
        assert "MEMORY" in types
        assert "DISK"   in types
        assert len(result) == 3

    # ── Missing telemetry ────────────────────────────────────────────────────

    def test_missing_count_triggers_telemetry_detection(self):
        """missing_count > 0 must produce a TELEMETRY detection."""
        result = detect_server_hard_rules(_server_row(missing_count=1))
        telemetry = [d for d in result if d.anomaly_type == "TELEMETRY"]
        assert len(telemetry) == 1
        assert telemetry[0].severity == "medium"
        assert telemetry[0].auto_create_incident is True

    def test_zero_missing_count_no_telemetry_detection(self):
        """missing_count == 0 — no TELEMETRY detection."""
        result = detect_server_hard_rules(_server_row(missing_count=0))
        telemetry = [d for d in result if d.anomaly_type == "TELEMETRY"]
        assert telemetry == []

    # ── Detection fields ─────────────────────────────────────────────────────

    def test_detection_has_correct_entity_fields(self):
        """Detection must carry the right entity_type, entity_id, server_id."""
        result = detect_server_hard_rules(_server_row(cpu_last=96.0))
        d = result[0]
        assert d.entity_type == "server"
        assert d.entity_id   == 1
        assert d.server_id   == 1
        assert d.service_id  is None

    def test_detection_score_is_capped_at_one(self):
        """score = min(1.0, value/100) — at 100% it must equal exactly 1.0."""
        result = detect_server_hard_rules(_server_row(cpu_last=100.0))
        cpu_d = next(d for d in result if d.anomaly_type == "CPU")
        assert cpu_d.score == 1.0

    def test_detection_confidence_is_095(self):
        """Hard rule detections always have confidence 0.95."""
        result = detect_server_hard_rules(_server_row(cpu_last=96.0))
        assert result[0].confidence == 0.95

    def test_hostname_appears_in_title(self):
        """Title must contain the hostname so engineers know which host."""
        result = detect_server_hard_rules(_server_row(cpu_last=96.0, hostname="prod-db-01"))
        assert "prod-db-01" in result[0].title

    def test_fallback_hostname_when_none(self):
        """If hostname is None, title should still contain 'server 1'."""
        result = detect_server_hard_rules(_server_row(cpu_last=96.0, hostname=None))
        assert "server 1" in result[0].title

    def test_none_metric_value_skipped(self):
        """If cpu_last is None, no CPU detection should be created."""
        result = detect_server_hard_rules(_server_row(cpu_last=None))
        cpu_detections = [d for d in result if d.anomaly_type == "CPU"]
        assert cpu_detections == []


# ═══════════════════════════════════════════════════════════════════════════════
# detect_service_hard_rules
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectServiceHardRules:

    def test_no_detections_when_metrics_normal(self):
        """CPU 50%, Memory 60% — both under 95.0 — no detection."""
        result = detect_service_hard_rules(_service_row())
        assert result == []

    def test_cpu_at_threshold_triggers_critical(self):
        """cpu_last == 95.0 on a service must return a critical CPU detection."""
        result = detect_service_hard_rules(_service_row(cpu_last=95.0))
        cpu_d = [d for d in result if d.anomaly_type == "CPU"]
        assert len(cpu_d) == 1
        assert cpu_d[0].severity == "critical"
        assert cpu_d[0].entity_type == "service"
        assert cpu_d[0].service_id == 1

    def test_memory_at_threshold_triggers_critical(self):
        """memory_last == 95.0 must trigger."""
        result = detect_service_hard_rules(_service_row(memory_last=95.0))
        mem_d = [d for d in result if d.anomaly_type == "MEMORY"]
        assert len(mem_d) == 1
        assert mem_d[0].severity == "critical"

    def test_both_cpu_and_memory_breach(self):
        """Both CPU and Memory above threshold — 2 detections."""
        result = detect_service_hard_rules(_service_row(cpu_last=97.0, memory_last=96.0))
        assert len(result) == 2

    def test_service_name_in_title(self):
        """Detection title must contain the service name."""
        result = detect_service_hard_rules(_service_row(
            cpu_last=96.0, service_name="order-service"
        ))
        assert "order-service" in result[0].title

    def test_fallback_service_name_when_none(self):
        """If service_name is None, title must contain 'service 1'."""
        result = detect_service_hard_rules(_service_row(
            cpu_last=96.0, service_name=None
        ))
        assert "service 1" in result[0].title


# ═══════════════════════════════════════════════════════════════════════════════
# Helper functions
# ═══════════════════════════════════════════════════════════════════════════════

class TestNumberHelper:

    def test_none_returns_none(self):
        assert _number(None) is None

    def test_valid_float_string(self):
        assert _number("95.5") == 95.5

    def test_valid_int(self):
        assert _number(80) == 80.0

    def test_nan_returns_none(self):
        import math
        assert _number(math.nan) is None

    def test_invalid_string_returns_none(self):
        assert _number("not_a_number") is None


class TestIntOrNoneHelper:

    def test_valid_value_converts_to_int(self):
        assert _int_or_none(3.9) == 3

    def test_none_returns_none(self):
        assert _int_or_none(None) is None

    def test_string_number_converts(self):
        assert _int_or_none("5") == 5
