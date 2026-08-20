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
