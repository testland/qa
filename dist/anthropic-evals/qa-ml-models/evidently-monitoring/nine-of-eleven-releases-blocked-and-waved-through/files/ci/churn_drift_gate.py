"""Pre-deploy data check for churn-propensity. Runs on every release candidate."""

import datetime as dt
import sys
from pathlib import Path

import pandas as pd
from evidently import Report
from evidently.presets import DataDriftPreset

from ci.gate_config import CANDIDATE, MONITORED_COLUMNS, REFERENCE, REFERENCE_MAX_AGE_DAYS


def reference_age_days(path: str) -> int:
    mtime = dt.date.fromtimestamp(Path(path).stat().st_mtime)
    return (dt.date.today() - mtime).days


def main() -> int:
    age = reference_age_days(REFERENCE)
    if age > REFERENCE_MAX_AGE_DAYS:
        print("WARNING: reference is " + str(age) + " days old; consider regenerating it")

    reference_df = pd.read_parquet(REFERENCE)[MONITORED_COLUMNS]
    current_df = pd.read_parquet(CANDIDATE)[MONITORED_COLUMNS]

    report = Report([DataDriftPreset()], include_tests=True)
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html("drift_report.html")

    failed = [t for t in result.dict()["tests"] if t.get("status") in ("FAIL", "ERROR")]
    if failed:
        raise SystemExit("check failed: " + str(len(failed)) + " test(s), see drift_report.html")

    print("check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
