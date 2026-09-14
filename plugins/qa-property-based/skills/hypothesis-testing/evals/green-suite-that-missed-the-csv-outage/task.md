# Four generated-input checks, all green, and the export still broke

## Problem Description

INC-4471 last Tuesday. The nightly account export for tenant 9f21 wrote the
literal text `nan` into 412 amount cells, the vendor importer rejected the whole
180,000-row file, and eleven tenants went a day without reconciliation. The
write-up is attached.

The part I want understood before anybody writes a line of new code is that
`tests/test_csvio.py` was green on the commit that shipped it, and green on
every commit for the six weeks before. There are four checks in that file
running against randomly generated input, put there specifically so that we
would not have to think of the bad cases ourselves. Four of them, all green, and
the thing went out anyway.

So: tell me, check by check, why that file did not catch this, and then make it
so the next one of these goes red before it ships instead of after.
`docs/export-format.md` is the vendor's wire format. It is not up for
negotiation - the importer is their product and we do not control it - so where
our code does not match that document, our code is what is wrong.

There is a second thing in `ops/dead-letters-august.md` that I noticed while
pulling the incident write-up together and have not had time to look into. It
may be nothing to do with any of this.

Not everything in that file is necessarily broken. I would far rather you told
me one of the four is fine and left it alone than have all four rewritten so it
looks thorough.

## Output Specification

1. Edit `tests/test_csvio.py`. Do not delete a check, and every check that is
   there now must still be drawing generated input when you are done.
2. Change `src/csvio.py` where it does not match `docs/export-format.md`.
3. Write `docs/csvio-audit.md` with a verdict on each of the four checks, saying
   for each one what it was actually proving before you touched it.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/INC-4471.md ===============
# INC-4471 - account export rejected by the downstream importer

- **Detected** 2026-09-08 14:02 UTC by the vendor importer's reject webhook.
- **Impact** 180,412-row nightly export rejected in full. Eleven tenants went a
  day without reconciliation.

## What happened

An upstream balance calculation divided by a zero denominator and produced a
`float('nan')` for 412 rows on tenant 9f21. Those values went through the export
path unchanged and landed in the amount column as the three characters `nan`.
The vendor importer parses that column strictly and rejects the entire file on
the first cell it cannot read as a decimal.

The same calculation can produce positive and negative infinity from the same
branch. We have not hit one in production yet.

## What did not happen

`tests/test_csvio.py` was green on 7c41ea9, the commit that shipped, and on
every commit back to 2026-07-24. Nothing in it went red at any point.

=============== FILE: docs/export-format.md ===============
# Account export - CSV wire format v3

Unchanged since 2026-03-11. The importer is a vendor product; this document
describes what it accepts, not what we would prefer.

## Amount cells

An amount cell is a decimal number with exactly two fractional digits,
optionally preceded by a minus sign. `0.00`, `-12.40`, `1000000.00`. Nothing
else is accepted in that column, and there is no representation in this format
for a value that is not a finite number. The importer parses the amount column
strictly and rejects the whole file on the first cell it cannot read.

## Currency cells

Three letters from ISO 4217. Lower-case input is upper-cased on export. The
importer accepts the whole ISO 4217 list, not a subset of it.

## Text cells

Any text. A cell containing a comma, a double quote or a newline is wrapped in
double quotes and its own double quotes are doubled.

=============== FILE: ops/dead-letters-august.md ===============
# Nightly export dead-letter queue, August

Rows the exporter refused and sent to the dead-letter queue rather than writing.
Nobody is paged on this queue; it is drained by hand when somebody remembers.

| Date       | Tenant | Rows | Reason recorded                    |
|------------|--------|-----:|------------------------------------|
| 2026-08-04 | 3a10   |  914 | not an ISO 4217 code: 'nok'        |
| 2026-08-11 | 3a10   |  951 | not an ISO 4217 code: 'nok'        |
| 2026-08-18 | c882   |  186 | not an ISO 4217 code: 'dkk'        |
| 2026-08-25 | 3a10   |  967 | not an ISO 4217 code: 'nok'        |

Tenant 3a10 has been on NOK since they signed. Neither tenant has ever appeared
in an export file. Nobody has complained, which is its own kind of worrying.

=============== FILE: src/csvio.py ===============
QUOTE = '"'

ISO_4217 = ("EUR", "GBP", "USD", "CHF", "SEK", "PLN", "JPY", "CAD")


class ExportError(ValueError):
    """Raised when a value cannot be represented in the v3 wire format."""


def encode_field(value: str) -> str:
    if any(c in value for c in (",", QUOTE, "\n")):
        return QUOTE + value.replace(QUOTE, QUOTE * 2) + QUOTE
    return value


def decode_field(text: str) -> str:
    if len(text) >= 2 and text.startswith(QUOTE) and text.endswith(QUOTE):
        return text[1:-1].replace(QUOTE * 2, QUOTE)
    return text


def format_amount(x: float) -> str:
    return f"{x:.2f}"


def amount_line(amounts: list[float]) -> str:
    return ",".join(format_amount(a) for a in amounts)


def normalise_currency(s: str) -> str:
    code = s.upper()
    if code not in ISO_4217:
        raise ExportError(f"not an ISO 4217 code: {s!r}")
    return code

=============== FILE: src/exporter.py ===============
"""Nightly account export. One line per row, rejects go to the dead-letter queue."""

from src.csvio import ExportError, amount_line, encode_field, normalise_currency


def write_export(rows, out, dead_letter) -> int:
    written = 0
    for row in rows:
        try:
            cells = [
                encode_field(row.name),
                normalise_currency(row.currency),
                amount_line(row.amounts),
            ]
        except ExportError:
            dead_letter(row)
            continue
        out.write(",".join(cells) + "\n")
        written += 1
    return written

=============== FILE: tests/test_csvio.py ===============
import re

from hypothesis import given, strategies as st

import src.csvio as csvio
from src.csvio import (
    amount_line,
    decode_field,
    encode_field,
    format_amount,
    normalise_currency,
)

DECIMAL = re.compile(r"-?\d+\.\d\d")


@given(st.text())
def test_field_escape_round_trip(value):
    assert decode_field(encode_field(value)) == value


@given(st.lists(st.floats(min_value=-1_000_000, max_value=1_000_000), min_size=1, max_size=20))
def test_amount_cells_are_decimal(amounts):
    for cell in amount_line(amounts).split(","):
        assert DECIMAL.fullmatch(cell)


@given(st.sampled_from(csvio.ISO_4217))
def test_currency_cell_normalised(code):
    assert normalise_currency(code.lower()) == code


@given(st.integers(min_value=0, max_value=100_000).map(lambda cents: cents / 100))
def test_amount_round_trip(x):
    assert float(format_amount(x)) == x

=============== FILE: ci/last-green-run.txt ===============
$ pytest tests/
============================= test session starts ==============================
collected 4 items

tests/test_csvio.py ....                                                 [100%]

============================== 4 passed in 1.83s ===============================

commit 7c41ea9 - the commit that shipped INC-4471

=============== FILE: requirements-dev.txt ===============
hypothesis==6.112.1
pytest==8.3.3
