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
| **Storage** | DB columns; serialised dates | RFC 3339 round-trip per [`iso-8601-vs-rfc-3339-reference`](../iso-8601-vs-rfc-3339-reference/SKILL.md) |
| **Business logic** | Age calculation; duration; expiry | DST, leap-day, monotonic |
| **Display** | User-facing dates | Per-user-tz formatting |
| **Cron / scheduled** | Periodic jobs | DST transition behaviour per [`dst-transition-reference`](../dst-transition-reference/SKILL.md) |
| **Billing** | Period boundaries | DST + month-end + leap year |
| **Audit / logging** | Timestamp emission | Monotonic; leap-second tolerance |
| **External API** | Third-party datetime strings | Tolerant parsing |

## Step 2 - Per-category test catalog

### Storage tests

| Test | Pattern |
|---|---|
| Round-trip RFC 3339 | parse → emit → parse → assert equal |
| Round-trip via JSON | serialise object → deserialise → assert |
| Microsecond precision preserved | `.123456Z` survives DB store/load |
| Zone information preserved or normalized to UTC | Document the policy |

### Business-logic tests

| Test | Pattern |
|---|---|
| DST spring-forward | Schedule at 02:30 local on transition day; verify behaviour |
| DST fall-back | Same 01:30 local appearing twice; verify ordering |
| Leap day Feb 29 | "1 year from Feb 29 2024" → Feb 28 2025 (Per ICU) |
| Year-end rollover | "Tomorrow" on Dec 31 |
| Month-end | Jan 31 + 1 month = Feb 28 / 29 (per library) |
| Negative durations | Operations on "5 minutes ago" |
| Leap second tolerance | Code uses monotonic time per [`leap-second-reference`](../leap-second-reference/SKILL.md) |

### Cron tests

| Test | Pattern |
|---|---|
| Daily 02:30 EST cron on spring-forward | Doesn't fire OR fires at 03:30 (per cron spec) |
| Daily 01:30 EST cron on fall-back | Fires once vs twice (per spec) |
| Monthly on Feb 29 (non-leap year) | Fires on Feb 28 OR not at all |
| Weekly cron crossing DST | 1-hour offset for one week |

### Billing tests

| Test | Pattern |
|---|---|
| Billing on month-end across leap year | Feb 28 vs Feb 29 handling |
| Billing window across DST | Hour gain / loss in the period |
| Pro-ration calculation | Across DST boundary |
| Multi-tenant timezone variance | Same wall-clock hour ≠ same UTC |

### Display tests

| Test | Pattern |
|---|---|
| Per-user TZ formatting | User in `Asia/Tokyo` sees `09:00 JST`; user in `Europe/London` sees `00:00 GMT` |
| ISO 8601 vs human-readable | Localised display ≠ wire format |
| 24h vs 12h convention | Per user locale |
| Relative time ("2 hours ago") | Per system locale |

## Step 3 - Per-language test harness

| Language | Fake-clock skill |
|---|---|
| Python | [`freezegun-python`](../freezegun-python/SKILL.md) |
| JS (general) | [`sinon-fake-timers-js`](../sinon-fake-timers-js/SKILL.md) |
| JS (Jest) | [`jest-fake-timers`](../jest-fake-timers/SKILL.md) |
| Ruby | [`timecop-ruby`](../timecop-ruby/SKILL.md) |
| JVM (Java / Kotlin) | [`mockclock-jvm`](../mockclock-jvm/SKILL.md) |
| C / native binary | [`libfaketime-c`](../libfaketime-c/SKILL.md) |

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
  [`dst-transition-reference`](../dst-transition-reference/SKILL.md),
  [`leap-second-reference`](../leap-second-reference/SKILL.md),
  [`iso-8601-vs-rfc-3339-reference`](../iso-8601-vs-rfc-3339-reference/SKILL.md).
- Per-language harnesses:
  [`libfaketime-c`](../libfaketime-c/SKILL.md),
  [`sinon-fake-timers-js`](../sinon-fake-timers-js/SKILL.md),
  [`jest-fake-timers`](../jest-fake-timers/SKILL.md),
  [`freezegun-python`](../freezegun-python/SKILL.md),
  [`timecop-ruby`](../timecop-ruby/SKILL.md),
  [`mockclock-jvm`](../mockclock-jvm/SKILL.md).
- Cross-plugin (cron):
  `cron-job-test-author` (qa-async-jobs).
