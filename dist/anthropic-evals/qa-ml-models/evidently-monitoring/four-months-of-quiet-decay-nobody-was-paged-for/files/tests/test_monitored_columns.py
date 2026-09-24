from monitoring.features import FEATURES, PREDICTION_COLUMN, TARGET_COLUMN
from monitoring.nightly_drift import MONITORED


def test_monitored_set_matches_the_feature_list():
    assert list(MONITORED) == list(FEATURES)


def test_no_duplicates():
    assert len(MONITORED) == len(set(MONITORED))


def test_outputs_are_not_listed_as_features():
    assert PREDICTION_COLUMN not in FEATURES
    assert TARGET_COLUMN not in FEATURES
