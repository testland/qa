from sqlalchemy import text


def reserve(engine, sku: str, qty: int = 1) -> bool:
    with engine.begin() as conn:
        stock = conn.execute(
            text("SELECT stock FROM inventory WHERE sku = :sku"), {"sku": sku}
        ).scalar_one()
        if stock < qty:
            return False
        conn.execute(
            text("UPDATE inventory SET stock = :s WHERE sku = :sku"),
            {"s": stock - qty, "sku": sku},
        )
        return True
