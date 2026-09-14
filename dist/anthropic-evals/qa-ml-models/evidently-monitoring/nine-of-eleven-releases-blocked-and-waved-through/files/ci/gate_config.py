from ci.schema import ALL_COLUMNS

# Policy since June: nothing in the warehouse goes unmonitored.
MONITORED_COLUMNS = list(ALL_COLUMNS)

REFERENCE = "data/reference_2026-05.parquet"
CANDIDATE = "data/candidate_eval.parquet"

# CI nags when the reference is older than this.
REFERENCE_MAX_AGE_DAYS = 30
