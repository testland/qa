from monitoring.columns import MONITORED, PREDICTION_COLUMN, SCHEMA, TARGET_COLUMN


def test_monitored_is_the_schema_minus_id_and_label():
    assert set(MONITORED) == set(SCHEMA) - {"quote_id", TARGET_COLUMN}


def test_the_model_output_is_monitored():
    assert PREDICTION_COLUMN in MONITORED


def test_no_duplicates():
    assert len(MONITORED) == len(set(MONITORED))
