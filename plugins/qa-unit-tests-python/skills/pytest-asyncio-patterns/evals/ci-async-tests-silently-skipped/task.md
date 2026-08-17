# CI has been green for tests it never ran

## Problem Description

A PR that broke currency conversion merged with a green check. The tests for the
broken function exist and they fail locally - `pytest` on a laptop reports the
failure immediately.

To confirm what we suspected, someone pushed a branch with
`assert convert_result == 999999` in one of the tests. The pipeline went green
again. Digging through the raw job log, the async tests are reported as skipped,
alongside a line saying `async def functions are not natively supported`. The
only test the job has genuinely been running for months is the synchronous one.

Nobody is sure when this started. The workflow has been touched a few times -
one of those edits was somebody chasing an unrelated warning. Nothing in the
tests themselves has changed.

Two things need to come out of this. The job has to actually run the async tests
again. And a future run in which the async tests silently do not execute must
fail the job instead of reporting success - we do not want to find the next
occurrence of this by reading a log.

## Output Specification

1. Deliver a corrected `.github/workflows/tests.yml`, and `pyproject.toml` if
   the second requirement needs it.
2. Explain in one or two sentences why the job behaved differently from a local
   run, given that both use the same repository.
3. Do not modify any file under `tests/`, and do not modify `app/rates.py`. The
   tests are correct; they were simply not executed.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "rates"
version = "4.2.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
asyncio_mode = "auto"

=============== FILE: requirements-dev.txt ===============
pytest==8.3.5
pytest-asyncio==0.25.3

=============== FILE: .github/workflows/tests.yml ===============
name: tests

on: [pull_request]

jobs:
  pytest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements-dev.txt
      - run: pytest --asyncio-mode=strict -q --junitxml=reports/pytest.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pytest-report
          path: reports/pytest.xml

=============== FILE: app/rates.py ===============
import asyncio


class RateStore:
    def __init__(self, table):
        self._table = table

    async def rate(self, code):
        await asyncio.sleep(0)
        if code not in self._table:
            raise LookupError(f"no rate for {code}")
        return self._table[code]


def known_codes(table):
    return sorted(table)


async def convert(store, amount, code):
    rate = await store.rate(code)
    return round(amount * rate, 2)

=============== FILE: tests/test_rates.py ===============
import pytest

from app.rates import RateStore, convert, known_codes

TABLE = {"EUR": 1.09, "GBP": 1.27}


def test_known_codes_are_sorted():
    assert known_codes(TABLE) == ["EUR", "GBP"]


async def test_rate_is_returned():
    store = RateStore(TABLE)
    assert await store.rate("EUR") == 1.09


async def test_unknown_code_raises():
    store = RateStore(TABLE)
    with pytest.raises(LookupError):
        await store.rate("JPY")


async def test_convert_rounds_to_cents():
    store = RateStore(TABLE)
    assert await convert(store, 10, "GBP") == 12.7
