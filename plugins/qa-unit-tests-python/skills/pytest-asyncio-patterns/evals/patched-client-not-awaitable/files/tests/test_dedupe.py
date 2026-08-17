from app.sync_job import dedupe


def test_dedupe_keeps_the_first_occurrence():
    items = [{"sku": "a", "qty": 1}, {"sku": "a", "qty": 2}, {"sku": "b", "qty": 3}]
    assert dedupe(items) == [{"sku": "a", "qty": 1}, {"sku": "b", "qty": 3}]


def test_dedupe_of_nothing_is_nothing():
    assert dedupe([]) == []
