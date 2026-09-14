from monitoring.features import FEATURES, PREDICTION_COLUMN, TARGET_COLUMN


def test_no_duplicate_features():
    assert len(FEATURES) == len(set(FEATURES))


def test_outputs_are_not_listed_as_features():
    assert PREDICTION_COLUMN not in FEATURES
    assert TARGET_COLUMN not in FEATURES
