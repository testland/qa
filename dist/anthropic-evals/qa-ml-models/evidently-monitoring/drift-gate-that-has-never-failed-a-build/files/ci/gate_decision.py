def should_block(result_dict) -> bool:
    """True when the drift report says this release candidate must not ship."""
    failed = [
        t for t in result_dict.get("tests", [])
        if t.get("status") in ("FAIL", "ERROR")
    ]
    return bool(failed)
