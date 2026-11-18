# We oversold stock while the inventory test passes every time

## Problem Description

We oversold a product (`docs/incident.md`) but `tests/test_inventory.py` passes every time. Make the test reproduce the oversell reliably, then fix `reserve`. Postgres isn't available in this sandbox, so write the code and explain how to run it.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: app/__init__.py ===============
# Package marker.

=============== FILE: app/inventory.py ===============
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

=============== FILE: tests/conftest.py ===============
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool


@pytest.fixture
def engine():
    eng = create_engine("sqlite://", poolclass=StaticPool,
                        connect_args={"check_same_thread": False})
    with eng.begin() as c:
        c.execute(text("CREATE TABLE inventory (sku TEXT PRIMARY KEY, stock INT NOT NULL)"))
        c.execute(text("INSERT INTO inventory VALUES ('GPU-1', 1)"))
    return eng

=============== FILE: tests/test_inventory.py ===============
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

=============== FILE: docker-compose.test.yml ===============
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: test
    ports: ["5432:5432"]

=============== FILE: requirements-dev.txt ===============
sqlalchemy>=2.0
psycopg[binary]>=3.2
pytest>=8

=============== FILE: docs/incident.md ===============
Black Friday: 37 orders were accepted for 20 units of GPU-1. Production runs
Postgres 16 behind 4 API pods with 8 worker processes each. tests/test_inventory.py
passes on every run.
