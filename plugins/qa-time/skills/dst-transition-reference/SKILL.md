---
name: dst-transition-reference
description: "Use for any question or task about daylight saving time in code or tests, including quick ones: what breaks on DST transition days, naive datetimes plus a duration, jobs or reports an hour off after the clocks change, cron jobs that fire zero or two times. Covers skipped and repeated hours, jurisdiction differences, the IANA tz database, billing and meetings on transition days, leap seconds and clock smearing."
---

# dst-transition-reference

## Overview

DST transitions cause a large share of production time-bugs:
spring-forward creates **non-existent local times**, fall-back
creates **duplicate local times**. The IANA Time Zone Database
([iana.org/time-zones](https://www.iana.org/time-zones)) is the
canonical source of historical and current DST rules.

## How to use this reference

1. **Identify the transition** the code crosses - spring-forward
   (skipped hour) or fall-back (repeated hour) - from the DST
   mechanics section below.
2. **Match the bug class** the code is exposed to (cron, billing,
   duration arithmetic, recurring meeting, storage) and apply its
   mitigation.
3. **Turn it into an assertion** using the testable-behaviours table -
   construct the transition timestamp and assert the library's
   documented result (see the worked example).
4. **Pick zones + fixture timestamps** from
   [references/jurisdictions-and-fixtures.md](references/jurisdictions-and-fixtures.md),
   then refresh them against IANA before each release.

## When to use

- Designing time-handling code that crosses DST boundaries.
- Auditing existing code for DST-safety.
- Writing test cases that exercise DST behaviour.
- Investigating "scheduled job ran twice / didn't run" reports.

## DST mechanics

### Spring-forward (skipped hour)

Per
[en.wikipedia.org/wiki/Daylight_saving_time](https://en.wikipedia.org/wiki/Daylight_saving_time),
in US Eastern: on the 2nd Sunday of March, at 02:00 local time
the clock jumps to 03:00. The 02:00-02:59 hour **does not
exist** in local time.

Tests against `2026-03-08 02:30 America/New_York` produce
ambiguous or invalid results depending on library:

| Library | Behaviour at non-existent local time |
|---|---|
| Python `pytz` (legacy) | `localize(dt, is_dst=None)` raises `NonExistentTimeError`; the default `localize(dt)` guesses instead of raising |
| Python `zoneinfo` (3.9+) | Keeps the wall time 02:30; `fold=0` uses the pre-transition offset (`02:30-05:00` EST), which is 03:30 EDT once converted (PEP 495) |
| Java `ZonedDateTime` | Constructor takes a resolver: STRICT / SMART_BACKWARD / SMART_FORWARD |
| JS Intl | Browsers vary; often returns the post-transition time |

### Fall-back (repeated hour)

In US Eastern: 1st Sunday of November at 02:00 local time, the
clock falls back to 01:00. The 01:00-01:59 hour **occurs
twice** - once as EDT (UTC-4), once as EST (UTC-5).

`2026-11-01 01:30 America/New_York` is ambiguous. Libraries
either:
- Pick one: `zoneinfo` defaults to `fold=0`, the first occurrence (EDT); pytz's default `localize(dt)` guesses (its docs example gives `01:30:00 EST-0500`, the second occurrence) and warns of "a 50% chance of it being out by one hour"
- Raise an error
- Take an `is_dst` / `fold` flag (Python 3.6+ has `fold=0|1`)

## Worked example - a spring-forward assertion

Goal: prove the code under test handles a **non-existent** local time
deterministically.

1. Pick the transition: America/New_York spring-forward on
   2026-03-08 - 02:00 local jumps to 03:00, so 02:00-02:59 does not
   exist.
2. Construct `2026-03-08 02:30 America/New_York` in the code path.
3. Assert against the library's documented behaviour (from the table
   above):
   - Python `zoneinfo` keeps 02:30 and, with the default `fold=0`,
     attaches the pre-transition offset: assert
     `dt.utcoffset() == timedelta(hours=-5)` and that
     `dt.astimezone(timezone.utc)` is 07:30 UTC (03:30 EDT once
     converted back). Never assert that the object itself reads 03:30.
   - Python `pytz` raises `NonExistentTimeError` only with
     `localize(dt, is_dst=None)` - pass `is_dst=None` and assert the raise.
   - Java `ZonedDateTime` applies its resolver - assert per the
     chosen STRICT / SMART_FORWARD rule.
4. Repeat for fall-back: `2026-11-01 01:30 America/New_York` occurs
   twice; assert the `fold` / `is_dst` selection picks the intended
   offset.

## Per-jurisdiction differences

Per-region DST rules (US, EU, Australia, and the growing list of
regions that abolished DST) and refreshable 2026 fixture timestamps
live in
[references/jurisdictions-and-fixtures.md](references/jurisdictions-and-fixtures.md).
Per IANA, rules change frequently - test against current zoneinfo,
not assumptions.

## Common bug classes

### Cron jobs

A "daily at 02:30" cron in `America/New_York`:

- Spring-forward day: **doesn't fire** (02:30 doesn't exist).
- Fall-back day: **fires twice** (02:30 EDT, then 02:30 EST).

Mitigation:
- Use UTC cron expressions when possible.
- For local-time business hours, accept the irregularity or
  schedule outside transition hours (04:00 is safe everywhere).
- Per `cron-job-test-author` (in the qa-async-jobs plugin):
  always test DST + leap-day edge cases.

### Billing periods

"Bill on the 1st of each month at 00:00 local time":

- Fine in jurisdictions without DST.
- Risk in DST-observing: 00:00 local on Nov 1 (US) might
  overlap with the fall-back hour if billing involves more than
  one event.

Mitigation: bill at UTC, or at a local hour known to be safe
(e.g., 06:00).

### Duration arithmetic

`tomorrow_same_time = today_same_time + Duration("24 hours")`:

- Spring-forward: result is 23 hours later in local time.
- Fall-back: result is 25 hours later in local time.

Mitigation: distinguish "24 hours from now" (Duration) from
"this time tomorrow" (calendar addition).

### Recurring meeting

"Every Monday at 09:00 local time":

- Crosses DST boundary → still 09:00 local, but **one hour earlier
  or later in UTC** than the previous week (09:00 EST is 14:00 UTC;
  09:00 EDT is 13:00 UTC).
- Calendar systems handle this; custom scheduling code often
  doesn't.

### Storage

Storing wall-clock-local strings ("2026-03-08 02:30") is unsafe
across DST. Always store UTC + zone identifier.

## Testable behaviours

| Behaviour | Test |
|---|---|
| Code handles non-existent local time | Construct `2026-03-08 02:30 America/New_York`; library raises or normalises; assert expected |
| Code handles ambiguous local time | Construct `2026-11-01 01:30 America/New_York`; library raises or picks; assert |
| Cron-equivalent fires 0 / 1 / 2 times | Simulate clock across the transition; count invocations |
| Duration vs calendar addition consistent | Assert difference on transition day |
| Storage uses UTC + zone | Parse stored value; expect ISO format with offset or `Z` |

Per
`timezone-test-matrix-builder`,
the test matrix combines (zone, transition-type, library-version).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Storing local times as strings | Ambiguous on fall-back; nonexistent on spring-forward | UTC + zone, or RFC 3339 with explicit offset |
| Assuming all jurisdictions observe DST | Half the world doesn't | Per-zone testing |
| Using "24 hours" for "tomorrow" | Off by 1 hour on transition days | Calendar arithmetic primitives |
| Pinning to a specific year's transition date | Rules change annually | Use IANA zoneinfo dynamically |
| Crossing DST with `naive` datetime | Behaviour undefined | Always tz-aware |
| Cron in local time without DST testing | Misses / duplicates jobs | Test transition days |
| Hardcoded UTC offset (-5:00) | Wrong when DST is in effect | Use zone identifier |

## Limitations

- **IANA zoneinfo changes throughout the year.** Sept 2026 may
  add or remove DST observance for some jurisdictions; test
  data goes stale.
- **OS / runtime zoneinfo versions differ.** Java's tzdata
  ships with the JDK; system tzdata is separate; Python's
  `zoneinfo` reads system tzdata. Mismatches cause subtle bugs.
- **Polar regions, antimeridian, and historic timezones.**
  Special cases not covered here.
- **Leap seconds are a separate discontinuity class.** The 23:59:60
  insertion mechanics, bug classes, and monotonic-clock fixes are in
  [references/leap-seconds.md](references/leap-seconds.md).

## References

- IANA Time Zone Database:
  [www.iana.org/time-zones](https://www.iana.org/time-zones).
- Wikipedia DST:
  [en.wikipedia.org/wiki/Daylight_saving_time](https://en.wikipedia.org/wiki/Daylight_saving_time).
- Python zoneinfo:
  [docs.python.org/3/library/zoneinfo.html](https://docs.python.org/3/library/zoneinfo.html).
- PEP 495 "Mind the Gap" (a time in a gap uses the rules before the
  transition when `fold=0`, after it when `fold=1`):
  [peps.python.org/pep-0495](https://peps.python.org/pep-0495/).
- pytz `localize()` and `is_dst=None`:
  [pypi.org/project/pytz](https://pypi.org/project/pytz/).
- Deep references (with their own citations): per-jurisdiction rules +
  fixtures in [references/jurisdictions-and-fixtures.md](references/jurisdictions-and-fixtures.md);
  leap-second mechanics + bug classes in
  [references/leap-seconds.md](references/leap-seconds.md) with the
  smear-vs-step record in
  [references/smear-strategies-and-history.md](references/smear-strategies-and-history.md).
- Cross-plugin:
  `cron-job-test-author` (qa-async-jobs).
- Consumed by:
  `fake-clock-testing`,
  `timezone-test-matrix-builder`.
