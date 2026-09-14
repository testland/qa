def should_block(report_dict):
    """True when the drift report says this release candidate must not ship."""
    summary = report_dict.get("summary", {})
    return not summary.get("all_passed", True)
