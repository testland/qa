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
