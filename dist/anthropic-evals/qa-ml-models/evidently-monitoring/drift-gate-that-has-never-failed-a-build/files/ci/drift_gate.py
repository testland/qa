"""Release drift gate. Runs on every release candidate."""

import sys

from evidently import Report
from evidently.presets import DataDriftPreset

from ci.datasets import current_dataset, reference_dataset
from ci.gate_decision import should_block


def main() -> int:
    reference_df = reference_dataset()
    current_df = current_dataset()

    report = Report([DataDriftPreset()])
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html("drift_report.html")

    if should_block(result.dict()):
        print("drift gate: BLOCK")
        return 1

    print("drift gate: passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
