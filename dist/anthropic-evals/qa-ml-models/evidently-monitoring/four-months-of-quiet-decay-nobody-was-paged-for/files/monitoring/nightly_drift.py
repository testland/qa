"""Nightly input monitor for delivery-eta. 02:15 UTC from Airflow."""

import datetime as dt
from pathlib import Path

from evidently import Report
from evidently.presets import DataDriftPreset

from monitoring import baseline
from monitoring.alerting import should_page
from monitoring.notify import notify_oncall
from monitoring.warehouse import load_day

BASELINE = "eta_v6_normal"


def main() -> None:
    day = dt.date.today() - dt.timedelta(days=1)

    reference_df = baseline.load(BASELINE)
    current_df = load_day(day)

    report = Report([DataDriftPreset()], include_tests=True)
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html(Path("monitoring/out/" + day.isoformat() + ".html"))

    if should_page(result.dict()):
        notify_oncall("delivery-eta input drift on " + str(day))
        return

    # quiet night - keep the snapshot on recent normal traffic
    baseline.refresh(current_df, BASELINE)


if __name__ == "__main__":
    main()
