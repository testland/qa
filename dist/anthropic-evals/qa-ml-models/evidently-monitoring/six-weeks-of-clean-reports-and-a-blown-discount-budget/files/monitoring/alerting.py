"""Notify/stay-quiet decision for the nightly job."""

DATASET_TEST_ID = "DriftedColumnsCount"


def drift_detected(result_dict) -> bool:
    """True when the run declares dataset-level drift."""
    for t in result_dict.get("tests", []):
        if t.get("id", "").startswith(DATASET_TEST_ID):
            return t.get("status") in ("FAIL", "ERROR")
    return False
