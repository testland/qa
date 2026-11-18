import threading
from app.inventory import reserve


def test_last_unit_sold_once(engine):
    results = []
    threads = [threading.Thread(target=lambda: results.append(reserve(engine, "GPU-1")))
               for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert results.count(True) == 1
