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
