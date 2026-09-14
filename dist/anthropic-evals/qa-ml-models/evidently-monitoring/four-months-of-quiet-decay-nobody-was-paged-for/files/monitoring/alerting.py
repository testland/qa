"""Shared page/no-page decision for both nightly jobs."""


def should_page(report_dict) -> bool:
    """True when the run contains something worth waking someone for."""
    tests = report_dict.get("tests", [])
    return any(t.get("status") in ("FAIL", "ERROR") for t in tests)
