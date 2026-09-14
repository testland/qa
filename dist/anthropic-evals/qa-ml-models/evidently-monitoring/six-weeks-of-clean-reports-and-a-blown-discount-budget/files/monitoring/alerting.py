"""Notify/stay-quiet decision for the nightly job."""

DATASET_DRIFT_SHARE = 0.5


def drift_detected(result_dict) -> bool:
    """True when the run declares dataset-level drift."""
    tests = result_dict.get("tests", [])
    if not tests:
        return False
    failed = [t for t in tests if t.get("status") in ("FAIL", "ERROR")]
    return len(failed) / len(tests) >= DATASET_DRIFT_SHARE
