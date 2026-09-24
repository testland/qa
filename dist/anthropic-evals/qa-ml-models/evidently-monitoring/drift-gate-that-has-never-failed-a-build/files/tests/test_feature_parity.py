from ci.feature_names import MODEL_FEATURES, WAREHOUSE_COLUMNS


def test_every_model_feature_exists_in_the_warehouse():
    assert set(MODEL_FEATURES) <= set(WAREHOUSE_COLUMNS)


def test_no_duplicate_feature_names():
    assert len(MODEL_FEATURES) == len(set(MODEL_FEATURES))
