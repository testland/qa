import datetime as dt

from monitoring import alert_rules
from monitoring.alert_rules import DEFAULT_THRESHOLD, SUPPRESSIONS, is_suppressed, threshold_for


def test_unconfigured_columns_get_the_default_threshold():
    assert threshold_for("currency") == DEFAULT_THRESHOLD


def test_a_configured_column_overrides_the_default():
    alert_rules.PER_COLUMN_THRESHOLDS["__probe__"] = 0.42
    try:
        assert threshold_for("__probe__") == 0.42
    finally:
        del alert_rules.PER_COLUMN_THRESHOLDS["__probe__"]


def test_a_suppression_applies_only_before_its_expiry():
    alert_rules.SUPPRESSIONS["__probe__"] = dt.date(2026, 9, 10)
    try:
        assert is_suppressed("__probe__", dt.date(2026, 9, 9)) is True
        assert is_suppressed("__probe__", dt.date(2026, 9, 10)) is False
    finally:
        del alert_rules.SUPPRESSIONS["__probe__"]


def test_every_suppression_carries_an_expiry_date():
    assert all(isinstance(v, dt.date) for v in SUPPRESSIONS.values())
