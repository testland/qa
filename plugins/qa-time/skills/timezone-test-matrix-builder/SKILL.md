---
name: timezone-test-matrix-builder
description: "Builds a timezone, daylight saving time (DST), and leap year / leap second test matrix from wherever a codebase reads or formats dates and times. Finds time-handling code (grep for datetime / Date / Instant / time.time / timezone), sorts each spot into storage, business-logic, display, cron, or billing, picks the edge cases that matter (DST spring-forward / fall-back, ambiguous local time, leap day Feb 29, ISO 8601 / RFC 3339 round-trip, zone-database updates), and emits per-spot test stubs wired to the language's fake-clock (mock-time) library. Use when a codebase needs timezone, DST, and leap-year test coverage derived from its own date/time usage."
---

# timezone-test-matrix-builder

## Overview

Time-related bugs are scattered across the codebase - storage,
display, business logic, scheduled jobs. The test matrix needs
to systematically exercise the canonical edge cases at each
touchpoint.

## When to use

- Introducing time-test coverage to a new codebase.
- After a time-related incident (DST bug, leap-day failure).
- Migrating from one timezone library to another.
- Periodic audit of time-handling.

## Step 1 - Inventory time touchpoints

```bash
# Generic
grep -rn 'datetime\|Date\|Instant\|time.time\|moment\.\|dayjs\|chrono' \
  --include='*.{py,js,ts,java,kt,rb,go,rs,cs}' .

# Per-language
grep -rn 'datetime.now\|datetime.utcnow\|Date.now\|Instant.now' .
grep -rn 'tz\|timezone\|zoneinfo\|ZoneId' .
grep -rn 'cron\|schedule' .
```

Categorise each match:

| Category | Examples | Test needs |
|---|---|---|
| **Storage** | DB columns; serialised dates | RFC 3339 round-trip per `iso-8601-vs-rfc-3339-reference` |
| **Business logic** | Age calculation; duration; expiry | DST, leap-day, monotonic |
| **Display** | User-facing dates | Per-user-tz formatting |
| **Cron / scheduled** | Periodic jobs | DST transition behaviour per `dst-transition-reference` |
| **Billing** | Period boundaries | DST + month-end + leap year |
| **Audit / logging** | Timestamp emission | Monotonic; leap-second tolerance |
| **External API** | Third-party datetime strings | Tolerant parsing |

## Step 2 - Per-category test catalog

For each touchpoint, pull the test cases matching its category from
[references/test-catalog.md](references/test-catalog.md), which lists
the storage, business-logic, cron, billing, and display tests to
exercise.

## Step 3 - Per-language test harness

| Language | Fake-clock skill |
|---|---|
| Python | `freezegun-python` |
| JS (general) | `sinon-fake-timers-js` |
| JS (Jest) | `jest-fake-timers` |
| Ruby | `timecop-ruby` |
| JVM (Java / Kotlin) | `mockclock-jvm` |
| C / native binary | `libfaketime-c` |

## Step 4 - Build the matrix

For each (category, touchpoint, language) cell, generate test
stubs:

```yaml
# tests/time/matrix.yaml
matrix:
  - touchpoint: BillingService.createCharge
    category: billing
    tests:
      - dst-fall-back
      - leap-year-feb-29
      - month-end-rollover
      - timezone-multi-tenant
    language: java
    harness: mockclock-jvm

  - touchpoint: ScheduledTask.runDaily
    category: cron
    tests:
      - dst-spring-forward
      - dst-fall-back
      - leap-day
    language: ruby
    harness: timecop-ruby

  # ...
```

## Step 5 - Emit per-cell test files

```python
# tests/time/test_billing_service.py
import pytest
from freezegun import freeze_time
from billing import BillingService

@freeze_time("2024-02-29T00:00:00Z")
def test_billing_handles_leap_day():
    charge = BillingService.create_charge_for_month(2024, 2)
    assert charge.days_in_period == 29

@freeze_time("2025-02-28T00:00:00Z")
def test_billing_handles_non_leap_february():
    charge = BillingService.create_charge_for_month(2025, 2)
    assert charge.days_in_period == 28

@freeze_time("2026-11-01T05:30:00Z")  # Just past fall-back in NY
def test_billing_period_spans_dst_fall_back():
    # Period from Nov 1 00:00 to Nov 2 00:00 in New_York
    # is 25 hours of UTC due to fall-back
    period = BillingService.month_period(year=2026, month=11, zone="America/New_York")
    assert period.duration.total_seconds() == 30 * 24 * 3600 + 3600  # 1 extra hour
```

## Step 6 - Run and validate the generated tests

Verify before recording coverage: run the emitted files
(`pytest tests/time/`, `mvn test`, etc.) and assert every DST and
leap-day case produces its expected pass (or the expected failure for a
known-bug reproduction). If a case errors instead of asserting, the
fake-clock wiring is wrong - fix the harness mapping (Step 3) or add the
missing `TZ` / zone for local-time cases - and re-run until the matrix is
green.

## Step 7 - Coverage doc

```markdown
# Time Test Matrix Coverage

## Touchpoints covered

| Service | Category | Tests | File |
|---|---|---|---|
| BillingService | billing | leap-day, dst-fall-back, month-end | tests/time/test_billing.py |
| ScheduledTask | cron | dst-spring-forward, leap-day | tests/time/test_cron.py |
| API serialiser | storage | rfc-3339-round-trip | tests/time/test_api_format.py |

## Coverage gaps

- BillingService - leap-second tolerance: deferred (low likelihood)
- Display layer: per-user-TZ rendering - manual QA only

## How to add a new touchpoint

1. Run inventory grep (Step 1).
2. Categorise (Step 2).
3. Update matrix.yaml.
4. Generate test from template (per Step 5).
```

## Worked example

Adding leap-day coverage to a Python `BillingService.create_charge_for_month`:
inventory (Step 1) categorises it as **billing**, whose catalog rows call for
month-end-across-leap-year, DST-window, and multi-tenant-timezone tests. Python
maps to `freezegun-python` (Step 3), so the emitted
`tests/time/test_billing_service.py` (Step 5) freezes `2024-02-29` asserting
`days_in_period == 29` and `2025-02-28` asserting `28`. Running the file
(Step 6) confirms both pass, and the coverage doc (Step 7) then records
BillingService's billing category as covered - the leap-year February boundary
is now exercised on every run.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only the happy path | Time bugs are edge cases | DST + leap-day mandatory |
| Live system time in tests | Annual / quarterly flakes | Always fake-clock |
| One mega-test for all time edge cases | Failures opaque | Per-category, per-touchpoint |
| Skip storage round-trip | Schema drift / serialiser bug hides | RFC 3339 round-trip everywhere |
| Test in UTC only | Misses local-zone DST / display bugs | Per-zone testing |
| Hardcoded dates that age | Re-write needed annually | Use relative dates or fake clock |
| No coverage doc | Gaps invisible | Step 7 |
| Ignore display-layer | Real users see wrong dates | Even if manual, document the manual coverage |

## References

- IANA Time Zone Database:
  [www.iana.org/time-zones](https://www.iana.org/time-zones).
- Companion catalogs:
  `dst-transition-reference`,
  `leap-second-reference`,
  `iso-8601-vs-rfc-3339-reference`.
- Per-language harnesses:
  `libfaketime-c`,
  `sinon-fake-timers-js`,
  `jest-fake-timers`,
  `freezegun-python`,
  `timecop-ruby`,
  `mockclock-jvm`.
- Cross-plugin (cron):
  `cron-job-test-author` (qa-async-jobs).
