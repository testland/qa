"""Nightly monitor for delivery-eta. 02:45 UTC from Airflow."""

import datetime as dt
from pathlib import Path

from evidently import Report
from evidently.presets import DataDriftPreset

from monitoring import baseline
from monitoring.alerting import should_page
from monitoring.features import FEATURES
from monitoring.notify import notify_oncall
from monitoring.warehouse import load_day

BASELINE = "eta_v6_normal"
MONITORED = FEATURES


def main() -> None:
    day = dt.date.today() - dt.timedelta(days=1)

    reference_df = baseline.load(BASELINE)[MONITORED]
    current_df = load_day(day)[MONITORED]

    report = Report([DataDriftPreset()], include_tests=True)
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html(Path("monitoring/out/" + day.isoformat() + ".html"))

    if should_page(result.dict()):
        notify_oncall("delivery-eta drift on " + str(day))

    baseline.archive(load_day(day), BASELINE, day)


if __name__ == "__main__":
    main()
