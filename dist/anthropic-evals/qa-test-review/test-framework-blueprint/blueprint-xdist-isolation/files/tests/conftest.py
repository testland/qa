import pytest
import psycopg

DSN = "postgresql://test:test@localhost:5432/api_test"


@pytest.fixture(scope="session")
def db():
    with psycopg.connect(DSN, autocommit=True) as conn:
        conn.execute("TRUNCATE users, orders, payments RESTART IDENTITY CASCADE")
        conn.execute("INSERT INTO plans (code) VALUES ('free'), ('pro')")
        yield conn
