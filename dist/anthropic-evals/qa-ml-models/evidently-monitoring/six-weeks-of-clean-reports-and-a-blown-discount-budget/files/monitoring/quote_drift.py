"""Nightly monitor for quote-accept. 03:00 Europe/London."""

import datetime as dt
import json
from pathlib import Path

from evidently import Report
from evidently.presets import DataDriftPreset

from monitoring.alerting import drift_detected
from monitoring.columns import MONITORED
from monitoring.notify import notify_oncall
from monitoring.warehouse import load_day, load_reference

REFERENCE_SNAPSHOT = "ref_2026-06-01_to_2026-06-28"


def main() -> None:
    day = dt.date.today() - dt.timedelta(days=1)

    reference_df = load_reference(REFERENCE_SNAPSHOT)[MONITORED]
    current_df = load_day(day)[MONITORED]

    report = Report([DataDriftPreset()], include_tests=True)
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html(Path("monitoring/out/" + day.isoformat() + ".html"))

    payload = result.dict()
    Path("monitoring/out/" + day.isoformat() + ".json").write_text(json.dumps(payload))

    if drift_detected(payload):
        notify_oncall("quote-accept drift on " + str(day))


if __name__ == "__main__":
    main()
