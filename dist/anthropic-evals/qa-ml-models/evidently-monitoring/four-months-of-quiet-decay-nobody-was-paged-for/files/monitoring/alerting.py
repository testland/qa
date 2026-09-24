"""Page/no-page decision for the nightly job."""


def should_page(result_dict) -> bool:
    """True when the run contains something worth waking someone for."""
    tests = result_dict.get("tests", [])
    if not tests:
        raise ValueError("run carried no tests")
    return any(t.get("status") in ("FAIL", "ERROR") for t in tests)
