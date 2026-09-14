from monitoring.alerting import should_page


def test_pages_when_a_test_failed():
    assert should_page({"tests": [{"status": "FAIL"}]}) is True


def test_pages_on_error_status():
    assert should_page({"tests": [{"status": "ERROR"}]}) is True


def test_quiet_when_every_test_passed():
    assert should_page({"tests": [{"status": "SUCCESS"}]}) is False


def test_quiet_when_the_run_carries_no_tests():
    assert should_page({"metrics": [{"id": "MAE", "value": 9.1}]}) is False
