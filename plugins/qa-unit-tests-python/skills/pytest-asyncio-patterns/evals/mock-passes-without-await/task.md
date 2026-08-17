# Green test, and the events still never left the box

## Problem Description

Downstream stopped receiving `order.placed` events three weeks ago. Nobody
noticed until the finance team asked why the reconciliation job had gone quiet.

The cause turned out to be one line in `app/orders.py`. During a refactor the
call into the publisher lost its `await`. In production the call therefore
schedules nothing and returns immediately; the only trace is a
`RuntimeWarning: coroutine ... was never awaited` line buried in the logs.

What bothers us more than the bug is that `test_place_publishes_event` was green
for the entire three weeks, and it is still green right now against the broken
code. The test is not asserting the thing we thought it was asserting. Before we
patch the service we want the test to prove it can catch this, because the same
mistake is easy to make again in the two other services that publish events.

## Output Specification

Work in this order and say what you observed at each step.

1. Change the publisher assertions in `tests/test_orders.py` so the suite fails
   against `app/orders.py` exactly as it stands today. Report the failure.
2. Then fix `app/orders.py` so the whole suite is green again.
3. Add a case proving the publisher is not used at all when the order is
   rejected for a non-positive total.
4. Apply the same treatment to the repository assertions - they have the same
   weakness even though that call is currently correct.

Do not replace the doubles with real infrastructure, and do not add packages.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "orders"
version = "1.2.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
asyncio_mode = "auto"

=============== FILE: requirements-dev.txt ===============
pytest==8.3.5
pytest-asyncio==0.25.3

=============== FILE: app/orders.py ===============
class OrderService:
    def __init__(self, repo, publisher):
        self._repo = repo
        self._publisher = publisher

    async def place(self, order):
        if order["total"] <= 0:
            raise ValueError("total must be positive")
        saved = await self._repo.save(order)
        self._publisher.publish("order.placed", {"id": saved["id"]})
        return saved

=============== FILE: tests/test_orders.py ===============
from unittest.mock import AsyncMock

import pytest

from app.orders import OrderService


@pytest.fixture
def repo():
    repo = AsyncMock()
    repo.save.return_value = {"id": 7, "total": 20}
    return repo


async def test_place_saves_order(repo):
    publisher = AsyncMock()
    service = OrderService(repo, publisher)

    result = await service.place({"total": 20})

    assert result == {"id": 7, "total": 20}
    repo.save.assert_called_once_with({"total": 20})


async def test_place_publishes_event(repo):
    publisher = AsyncMock()
    service = OrderService(repo, publisher)

    await service.place({"total": 20})

    publisher.publish.assert_called_once_with("order.placed", {"id": 7})


async def test_rejects_non_positive_total(repo):
    publisher = AsyncMock()
    service = OrderService(repo, publisher)

    with pytest.raises(ValueError):
        await service.place({"total": 0})
