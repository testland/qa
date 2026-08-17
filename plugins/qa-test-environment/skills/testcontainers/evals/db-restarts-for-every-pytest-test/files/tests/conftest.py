import pytest
from testcontainers.postgres import PostgresContainer

from myapp.db import run_migrations


@pytest.fixture
def db_url():
    postgres = PostgresContainer("postgres:16")
    postgres.start()
    url = postgres.get_connection_url()
    run_migrations(url)
    yield url
    postgres.stop()
