import pytest

from monitoring.alerting import should_page


def test_pages_when_a_test_failed():
    assert should_page({"tests": [{"status": "FAIL"}]}) is True


def test_pages_on_error_status():
    assert should_page({"tests": [{"status": "ERROR"}]}) is True


def test_quiet_when_every_test_passed():
    assert should_page({"tests": [{"status": "SUCCESS"}]}) is False


def test_a_run_with_no_tests_is_a_bug_not_a_quiet_night():
    with pytest.raises(ValueError):
        should_page({"metrics": [{"id": "MAE", "value": 9.1}]})
