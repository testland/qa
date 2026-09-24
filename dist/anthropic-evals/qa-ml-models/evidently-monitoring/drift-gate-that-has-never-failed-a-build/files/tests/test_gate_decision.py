from ci.gate_decision import should_block


def test_blocks_when_a_test_failed():
    assert should_block({"tests": [{"status": "FAIL"}]}) is True


def test_blocks_on_error_status():
    assert should_block({"tests": [{"status": "ERROR"}]}) is True


def test_ships_when_every_test_passed():
    assert should_block({"tests": [{"status": "SUCCESS"}]}) is False


def test_ships_when_the_result_carries_no_tests():
    assert should_block({"metrics": [{"id": "DriftedColumnsCount", "value": 2}]}) is False
