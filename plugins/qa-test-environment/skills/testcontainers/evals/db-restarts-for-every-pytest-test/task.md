# Integration suite takes 11 minutes because the database starts 63 times

## Problem Description

There are 63 tests behind the `db_url` fixture. Each one takes about nine
seconds, of which eight is Postgres starting and the migrations running. The
whole file set takes eleven minutes and nobody runs it before pushing any more -
they let CI find out.

The tests themselves are fast. The cost is entirely that a fresh database is
created, migrated, and thrown away per test.

Two things have to keep working. The tests are currently independent because
every one of them gets a virgin database, and we are not willing to trade that
for speed - a test must not see rows another test wrote, and the order the files
run in must not matter. And `test_migration.py` deliberately wants a database
with no schema in it, which is the one place the current arrangement is doing
something useful.

We also want the database gone at the end of a run, including when a test raises
and when someone hits Ctrl-C halfway through.

## Output Specification

1. Reduce the number of database startups to what the run actually needs.
2. Preserve test independence explicitly: state and implement how a test is
   prevented from seeing another test's rows.
3. The database must be removed at the end of the run, including when a test
   raises during setup and when the run is interrupted.
4. Keep the `db_url` fixture name and its returned value. `test_migration.py`
   must still receive a database with no application schema in it, without
   dragging the other 62 tests back to a per-test startup.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/conftest.py ===============
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

=============== FILE: tests/test_accounts.py ===============
from myapp.accounts import AccountRepository


def test_creates_an_account(db_url):
    repo = AccountRepository(db_url)

    repo.create(email="ada@example.com", name="Ada")

    assert repo.find_by_email("ada@example.com").name == "Ada"


def test_rejects_a_duplicate_email(db_url):
    repo = AccountRepository(db_url)
    repo.create(email="ada@example.com", name="Ada")

    try:
        repo.create(email="ada@example.com", name="Someone else")
        raise AssertionError("expected a duplicate-email error")
    except ValueError:
        pass


def test_lists_every_account(db_url):
    repo = AccountRepository(db_url)
    repo.create(email="ada@example.com", name="Ada")
    repo.create(email="bob@example.com", name="Bob")

    assert len(repo.list_all()) == 2

=============== FILE: tests/test_ledger.py ===============
from decimal import Decimal

from myapp.ledger import Ledger


def test_records_a_credit(db_url):
    ledger = Ledger(db_url)

    ledger.credit(account="ada", amount=Decimal("42.00"))

    assert ledger.balance("ada") == Decimal("42.00")


def test_balance_of_an_unknown_account_is_zero(db_url):
    ledger = Ledger(db_url)

    assert ledger.balance("nobody") == Decimal("0.00")


def test_totals_across_all_accounts(db_url):
    ledger = Ledger(db_url)
    ledger.credit(account="ada", amount=Decimal("42.00"))
    ledger.credit(account="bob", amount=Decimal("8.00"))

    assert ledger.total() == Decimal("50.00")

=============== FILE: tests/test_migration.py ===============
from myapp.db import run_migrations, table_names


def test_migration_creates_every_table_from_an_empty_database(db_url):
    # db_url arrives already migrated, so this re-runs the migration and
    # asserts it is safe to apply twice
    run_migrations(db_url)

    assert {"accounts", "ledger_entries"} <= set(table_names(db_url))

=============== FILE: pytest.ini ===============
[pytest]
testpaths = tests
addopts = -ra
