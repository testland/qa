"""Nightly accuracy monitor for delivery-eta. 02:45 UTC, after the input job.

Labels land ~2h after delivery, so the day being checked is fully labelled.
"""

import datetime as dt
from pathlib import Path

from evidently import Report
from evidently.presets import RegressionPreset

from monitoring import baseline
from monitoring.alerting import should_page
from monitoring.features import FEATURES, PREDICTION_COLUMN, TARGET_COLUMN
from monitoring.notify import notify_oncall
from monitoring.warehouse import load_day

BASELINE = "eta_v6_normal"
COLUMNS = FEATURES + [PREDICTION_COLUMN, TARGET_COLUMN]


def main() -> None:
    day = dt.date.today() - dt.timedelta(days=1)

    reference_df = baseline.load(BASELINE)[COLUMNS]
    current_df = load_day(day)[COLUMNS]

    report = Report([RegressionPreset()])
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html(Path("monitoring/out/quality-" + day.isoformat() + ".html"))

    if should_page(result.dict()):
        notify_oncall("delivery-eta accuracy on " + str(day))


if __name__ == "__main__":
    main()
