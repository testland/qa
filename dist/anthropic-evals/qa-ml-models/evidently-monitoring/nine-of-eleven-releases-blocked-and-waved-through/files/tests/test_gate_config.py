from ci.gate_config import MONITORED_COLUMNS, REFERENCE
from ci.schema import ALL_COLUMNS


def test_every_schema_column_is_monitored():
    assert set(MONITORED_COLUMNS) == set(ALL_COLUMNS)


def test_no_duplicates_in_the_monitored_set():
    assert len(MONITORED_COLUMNS) == len(set(MONITORED_COLUMNS))


def test_reference_is_the_may_snapshot():
    assert REFERENCE.endswith("reference_2026-05.parquet")
