"""
Unit Tests — app/detectors/trend.py

Tests disk trend detection logic.
No database needed — plain dicts simulate rollup rows.
"""
import pytest
from datetime import datetime, timezone
from app.detectors.trend import detect_server_trends


# ── Helper ────────────────────────────────────────────────────────────────────

def _row(**overrides) -> dict:
    """Build a minimal server rollup row. Defaults: no anomaly."""
    start = datetime(2024, 8, 1, 10, 0, 0, tzinfo=timezone.utc)
    end   = datetime(2024, 8, 1, 10, 1, 0, tzinfo=timezone.utc)
    base = {
        "server_id":      1,
        "hostname":       "web-01",
        "window_start":   start,
        "window_end":     end,
        "disk_avg":       60.0,      # below 75% — won't trigger by default
        "disk_delta_30m": 0.5,       # small delta — won't trigger
    }
    base.update(overrides)
    return base


# ═══════════════════════════════════════════════════════════════════════════════
# Basic trigger logic
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectServerTrends:

    def test_no_detection_when_disk_low_and_delta_small(self):
        """disk_avg=60, delta=0.5 — below both conditions — no detection."""
        result = detect_server_trends(_row())
        assert result == []

    def test_no_detection_when_delta_below_2(self):
        """disk_delta_30m < 2.0 skips detection even if disk_avg is high."""
        result = detect_server_trends(_row(disk_avg=80.0, disk_delta_30m=1.9))
        assert result == []

    def test_no_detection_when_disk_below_75(self):
        """disk_avg < 75 skips detection even if delta is large."""
        result = detect_server_trends(_row(disk_avg=74.9, disk_delta_30m=3.0))
        assert result == []

    def test_triggers_when_both_conditions_met(self):
        """delta >= 2.0 AND disk_avg >= 75.0 — must trigger DISK_TREND."""
        result = detect_server_trends(_row(disk_avg=80.0, disk_delta_30m=2.0))
        assert len(result) == 1
        assert result[0].anomaly_type == "DISK_TREND"

    def test_anomaly_type_is_disk_trend(self):
        """Detection must have anomaly_type == 'DISK_TREND'."""
        result = detect_server_trends(_row(disk_avg=80.0, disk_delta_30m=3.0))
        assert result[0].anomaly_type == "DISK_TREND"

    def test_detector_name_is_trend(self):
        """detector_name must be 'trend'."""
        result = detect_server_trends(_row(disk_avg=80.0, disk_delta_30m=3.0))
        assert result[0].detector_name == "trend"

    # ── Severity ──────────────────────────────────────────────────────────────

    def test_severity_high_when_projected_hours_le_6(self):
        """
        projected_hours = ((90 - disk_avg) / delta) * 0.5
        disk_avg=88, delta=4 → (2/4)*0.5 = 0.25 hours → severity 'high'
        """
        result = detect_server_trends(_row(disk_avg=88.0, disk_delta_30m=4.0))
        assert result[0].severity == "high"

    def test_severity_medium_when_projected_hours_gt_6(self):
        """
        disk_avg=76, delta=2 → ((90-76)/2)*0.5 = 3.5 hours → still <= 6 → high
        disk_avg=76, delta=2.0 with slower growth:
        Use disk_avg=76, delta=2 → (14/2)*0.5 = 3.5 → high
        Use disk_avg=76, delta=1.5 → but 1.5 < 2 so no trigger
        Use disk_avg=76, delta=2 → (14/2)*0.5 = 3.5h → high

        For medium we need projected > 6:
        disk_avg=75, delta=2 → (15/2)*0.5 = 3.75h → still high
        disk_avg=75, delta=2 → projected = 3.75 → high
        Use very large gap: disk_avg=75, delta=2 → ((90-75)/2)*0.5 = 3.75 → high
        disk_avg=75, delta=0.5 → under threshold
        Need projected > 6: ((90 - disk_avg) / delta) * 0.5 > 6
        → 90 - disk_avg > 12 * delta
        disk_avg=75, delta=1.1 (< 2) → no trigger
        disk_avg=76, delta=2 → projected=3.5h → high
        disk_avg=78, delta=2 → (12/2)*0.5=3h → high
        For medium: need (90-disk)/delta * 0.5 > 6 → 90-disk > 12*delta
        Example: disk=75, delta=0.99 (no trigger)
        Example: disk=75.5, delta=2 → (14.5/2)*0.5=3.625 high
        Trick: disk=76, delta=2, then (90-76)/2 *0.5 = 3.5h high
        
        Proper medium example: disk_avg=77, disk_delta_30m=2 
        → projected = ((90-77)/2)*0.5 = 3.25h → still < 6 → high
        
        Actually for projected > 6h: (90-disk)/delta > 12
        Use disk=76, delta=2: 14/2=7 > not > 12
        Use disk=76, delta=1 → under trigger threshold
        So to get medium: need (90-x)/d > 12, d >= 2
        → 90-x > 24 → x < 66 → but disk must be >= 75!
        This means with threshold at 75% and delta >= 2:
        max possible projected = ((90-75)/2)*0.5 = 3.75h → always HIGH
        
        Conclusion: with disk >= 75 and delta >= 2, projected always <= 3.75h,
        so severity is always 'high'. Test this reality.
        """
        # With the constraints (disk>=75, delta>=2), severity is always high
        result = detect_server_trends(_row(disk_avg=75.0, disk_delta_30m=2.0))
        # projected = ((90-75)/2)*0.5 = 3.75h → <= 6 → high
        assert result[0].severity == "high"

    def test_severity_medium_with_slow_growth(self):
        """
        Achieve medium severity:
        Need projected > 6h: ((90-disk)/delta)*0.5 > 6 → (90-disk)/delta > 12
        With disk >= 75 and delta >= 2, max (90-75)/2 = 7.5, not > 12.
        So medium is only achievable if delta is very small.
        But delta < 2.0 → no trigger at all.
        Therefore: medium severity CANNOT be reached given these constraints.
        This test documents that finding — verify it returns empty.
        """
        # This confirms the dead branch: medium severity is architecturally unreachable
        result = detect_server_trends(_row(disk_avg=76.0, disk_delta_30m=1.9))
        assert result == []  # delta < 2 → no trigger

    # ── auto_create_incident ──────────────────────────────────────────────────

    def test_auto_create_incident_true_when_high(self):
        """High severity detections must have auto_create_incident=True."""
        result = detect_server_trends(_row(disk_avg=88.0, disk_delta_30m=4.0))
        assert result[0].auto_create_incident is True

    # ── Fields ────────────────────────────────────────────────────────────────

    def test_detection_entity_fields(self):
        """Entity fields must be correct."""
        result = detect_server_trends(_row(disk_avg=80.0, disk_delta_30m=3.0))
        d = result[0]
        assert d.entity_type  == "server"
        assert d.entity_id    == 1
        assert d.server_id    == 1
        assert d.service_id   is None
        assert d.threshold    == 90.0
        assert d.upper_bound  == 90.0
        assert d.confidence   == 0.75

    def test_metric_value_is_disk_avg(self):
        """metric_value must be the current disk_avg, not delta."""
        result = detect_server_trends(_row(disk_avg=82.0, disk_delta_30m=3.0))
        assert result[0].metric_value == 82.0

    def test_hostname_in_title(self):
        """Title must contain the server hostname."""
        result = detect_server_trends(_row(
            disk_avg=80.0, disk_delta_30m=3.0, hostname="storage-01"
        ))
        assert "storage-01" in result[0].title

    def test_fallback_hostname_when_none(self):
        """If hostname is None, title must use 'server 1'."""
        result = detect_server_trends(_row(
            disk_avg=80.0, disk_delta_30m=3.0, hostname=None
        ))
        assert "server 1" in result[0].title

    def test_score_proportional_to_delta(self):
        """score = min(1.0, delta/10). delta=5 → score=0.5."""
        result = detect_server_trends(_row(disk_avg=80.0, disk_delta_30m=5.0))
        assert abs(result[0].score - 0.5) < 0.001

    def test_score_capped_at_1(self):
        """score = min(1.0, delta/10). delta=15 → score=1.0."""
        result = detect_server_trends(_row(disk_avg=80.0, disk_delta_30m=15.0))
        assert result[0].score == 1.0

    def test_feature_values_contain_expected_keys(self):
        """feature_values must include disk_avg, disk_delta_30m, projected_hours_to_90."""
        result = detect_server_trends(_row(disk_avg=80.0, disk_delta_30m=3.0))
        fv = result[0].feature_values
        assert "disk_avg"               in fv
        assert "disk_delta_30m"         in fv
        assert "projected_hours_to_90"  in fv

    def test_reason_code_is_disk_growth_trend(self):
        """reason_codes must contain 'disk_growth_trend'."""
        result = detect_server_trends(_row(disk_avg=80.0, disk_delta_30m=3.0))
        assert "disk_growth_trend" in result[0].reason_codes

    def test_no_detection_when_disk_avg_is_none(self):
        """None disk_avg → no trigger (safe handling)."""
        result = detect_server_trends(_row(disk_avg=None, disk_delta_30m=3.0))
        assert result == []

    def test_no_detection_when_delta_is_none(self):
        """None disk_delta_30m → no trigger (safe handling)."""
        result = detect_server_trends(_row(disk_avg=80.0, disk_delta_30m=None))
        assert result == []
