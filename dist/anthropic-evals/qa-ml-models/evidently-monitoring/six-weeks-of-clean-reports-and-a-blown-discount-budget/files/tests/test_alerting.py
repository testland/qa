from monitoring.alerting import drift_detected


def _tests(failed, passed):
    return {"tests": [{"status": "FAIL"}] * failed + [{"status": "SUCCESS"}] * passed}


def test_dataset_drift_when_most_columns_fail():
    assert drift_detected(_tests(12, 10)) is True


def test_no_dataset_drift_when_one_column_fails():
    assert drift_detected(_tests(1, 21)) is False


def test_no_dataset_drift_when_nothing_fails():
    assert drift_detected(_tests(0, 22)) is False


def test_a_run_carrying_no_tests_reports_nothing():
    assert drift_detected({"metrics": []}) is False
