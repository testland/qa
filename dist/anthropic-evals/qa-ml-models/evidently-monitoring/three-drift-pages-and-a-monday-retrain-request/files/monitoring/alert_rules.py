"""Per-column alert configuration for the nightly drift job.

Changes here ship by PR and take effect on the next scheduled run.
"""

import datetime as dt

DEFAULT_THRESHOLD = 0.1

# column -> threshold, for columns that need something other than the default
PER_COLUMN_THRESHOLDS: dict[str, float] = {}

# column -> date the suppression expires (exclusive). Every entry needs a
# runbook reference in the PR description.
SUPPRESSIONS: dict[str, dt.date] = {}


def threshold_for(column: str) -> float:
    return PER_COLUMN_THRESHOLDS.get(column, DEFAULT_THRESHOLD)


def is_suppressed(column: str, on: dt.date) -> bool:
    until = SUPPRESSIONS.get(column)
    return until is not None and on < until
