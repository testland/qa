from monitoring.alerting import drift_detected


def _run(dataset_status, failing_columns):
    tests = [{"id": "DriftedColumnsCount", "status": dataset_status}]
    tests += [
        {"id": "ValueDrift(column=" + c + ")", "status": "FAIL"}
        for c in failing_columns
    ]
    return {"tests": tests}


def test_dataset_drift_is_reported():
    assert drift_detected(_run("FAIL", ["driver_age", "annual_mileage"])) is True


def test_an_error_status_counts():
    assert drift_detected(_run("ERROR", [])) is True


def test_a_single_failing_column_is_not_dataset_drift():
    assert drift_detected(_run("SUCCESS", ["driver_age"])) is False


def test_nothing_failing_is_quiet():
    assert drift_detected(_run("SUCCESS", [])) is False
