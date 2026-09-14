from ci.gate_decision import should_block


def test_blocks_when_a_test_failed():
    assert should_block({"summary": {"all_passed": False}}) is True


def test_ships_when_all_tests_passed():
    assert should_block({"summary": {"all_passed": True}}) is False


def test_ships_when_the_report_has_no_summary():
    assert should_block({}) is False
