---
name: timezone-test-matrix-builder
description: "Workflow-driven skill that builds a timezone + DST + leap-related test matrix from a code-base's time-touchpoint inventory. Walks through: inventorying time-related code (grep for datetime / Date / Instant / time.time / current_user_tz), categorizing each touchpoint (storage, business-logic, display, cron, billing), picking the relevant test categories (DST spring/fall, ambiguous local time, leap day Feb 29, leap second, ISO/RFC 3339 round-trip, zone-database update tolerance), and emitting per-touchpoint test stubs using the language-native fake-clock skill. Use when a code base needs a timezone, DST, and leap-related test matrix derived from its own time touchpoints."
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

## How to use

1. Inventory time touchpoints with the grep patterns and categorise
   each hit (Step 1).
2. For each touchpoint's category, pull the relevant cases from the
   per-category catalog (Step 2).
3. Map each touchpoint's language to its fake-clock harness skill
   (Step 3).
4. Record every (touchpoint, category, tests, language, harness) cell
   in `matrix.yaml` (Step 4).
5. Emit one test file per cell from the harness template (Step 5).
6. Write the coverage doc, listing covered touchpoints and explicit
   gaps (Step 6).
7. Re-run the inventory grep periodically to catch new touchpoints.

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

## Step 6 - Coverage doc

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

Adding leap-day coverage to a Python `BillingService`:

1. Inventory (Step 1) finds `BillingService.create_charge_for_month`;
   categorise it as **billing**.
2. The billing rows of the catalog
   ([references/test-catalog.md](references/test-catalog.md)) call for
   month-end-across-leap-year, DST-window, and multi-tenant-timezone
   tests.
3. Python maps to the `freezegun-python` harness (Step 3).
4. Add the cell to `matrix.yaml` (Step 4).
5. Emit `tests/time/test_billing_service.py` with
   `@freeze_time("2024-02-29T00:00:00Z")` asserting
   `days_in_period == 29`, plus a companion `@freeze_time("2025-02-28...")`
   asserting `28` (Step 5).
6. Record the touchpoint in the coverage doc (Step 6).

Result: the leap-year February boundary is exercised on every run,
and the coverage doc shows BillingService's billing category as
covered.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only the happy path | Time bugs are edge cases | DST + leap-day mandatory |
| Live system time in tests | Annual / quarterly flakes | Always fake-clock |
| One mega-test for all time edge cases | Failures opaque | Per-category, per-touchpoint |
| Skip storage round-trip | Schema drift / serialiser bug hides | RFC 3339 round-trip everywhere |
| Test in UTC only | Misses local-zone DST / display bugs | Per-zone testing |
| Hardcoded dates that age | Re-write needed annually | Use relative dates or fake clock |
| No coverage doc | Gaps invisible | Step 6 |
| Ignore display-layer | Real users see wrong dates | Even if manual, document the manual coverage |

## Output

This skill produces:

- A time-touchpoint inventory (Step 1).
- A category × language matrix (Step 4).
- Per-cell test files (Step 5).
- A coverage doc with gaps (Step 6).

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
