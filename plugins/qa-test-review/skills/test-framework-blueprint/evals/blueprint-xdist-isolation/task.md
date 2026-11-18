# The API suite fails at random since we moved to pytest -n 8

## Problem Description

Our API suite started failing at random after we switched to `pytest -n 8` (`docs/ci-history.md`). Review the lead's draft in `docs/blueprint-draft.md` and write the corrected framework blueprint to `docs/test-blueprint.md`, including the fixture changes.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: docs/blueprint-draft.md ===============
# API test framework (draft by the lead)

- Runner: pytest 8 with pytest-xdist, `pytest -n 8` in CI to cut the 22-minute run.
- Database: one shared Postgres `api_test` database for the whole run.
- `conftest.py`: a session-scoped `db` fixture truncates every table and seeds reference
  data (countries, plans) once per test run.
- Tests may build on data created by earlier tests in the same module, for example
  `test_create_user` and then `test_login_user`.
- A test that fails intermittently gets `@pytest.mark.flaky(reruns=3)`.

=============== FILE: tests/conftest.py ===============
import pytest
import psycopg

DSN = "postgresql://test:test@localhost:5432/api_test"


@pytest.fixture(scope="session")
def db():
    with psycopg.connect(DSN, autocommit=True) as conn:
        conn.execute("TRUNCATE users, orders, payments RESTART IDENTITY CASCADE")
        conn.execute("INSERT INTO plans (code) VALUES ('free'), ('pro')")
        yield conn

=============== FILE: docs/ci-history.md ===============
Since we enabled `-n 8`: random failures such as missing users, duplicate key
violations on plans, and orders disappearing mid-test. Every run with `-n 0` passes.
14 tests now carry @pytest.mark.flaky(reruns=3).
