---
name: dst-transition-reference
description: "Pure-reference catalog of Daylight Saving Time (DST) transition patterns and their canonical bug classes. Covers the spring-forward (skipped hour: 02:00 → 03:00 local) and fall-back (repeated hour: 02:00 → 01:00 local) transitions, the historical irregularity of DST (different jurisdictions, transitions on different dates, some regions abolish DST or never adopted it), the IANA timezone database (tz / Olson DB) as the canonical source, and the testable behaviors DST creates (duplicate / missing local timestamps, cron jobs that fire 0 or 2 times, billing periods that miss / double-count, recurring meetings on transition days). Use when designing or auditing time-handling code or test cases. Composes leap-second-reference + iso-8601-vs-rfc-3339-reference."
rating: 22
d6: 4
---

# dst-transition-reference

## Overview

DST transitions are responsible for a large share of
production time-bugs. They happen twice yearly in many
jurisdictions, on dates that vary by region, and create
**non-existent local times** (spring-forward) and **duplicate
local times** (fall-back).

The IANA Time Zone Database
([iana.org/time-zones](https://www.iana.org/time-zones)) - also
known as the tz database or the Olson database - is the
canonical source of historical and current DST rules.

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
| Python `pytz` (legacy) | `pytz.exceptions.NonExistentTimeError` |
| Python `zoneinfo` (3.9+) | Returns the "would-be" time + 1h (=03:30 EDT) |
| Java `ZonedDateTime` | Constructor takes a resolver: STRICT / SMART_BACKWARD / SMART_FORWARD |
| JS Intl | Browsers vary; often returns the post-transition time |

### Fall-back (repeated hour)

In US Eastern: 1st Sunday of November at 02:00 local time, the
clock falls back to 01:00. The 01:00-01:59 hour **occurs
twice** - once as EDT (UTC-4), once as EST (UTC-5).

`2026-11-01 01:30 America/New_York` is ambiguous. Libraries
either:
- Pick one (typically the first occurrence in pytz/zoneinfo)
- Raise an error
- Take an `is_dst` / `fold` flag (Python 3.6+ has `fold=0|1`)

## Per-jurisdiction differences

| Region | DST behaviour |
|---|---|
| US (most) | Spring-forward 2nd Sun March; fall-back 1st Sun November |
| EU | Last Sun March; last Sun October (one hour earlier) |
| Australia (most of NSW/VIC) | First Sun October; first Sun April (Southern hemisphere - reversed) |
| Australia (QLD, NT, WA, NT) | No DST |
| Japan, China, India | No DST |
| Russia | Abolished DST in 2011 |
| Iran | Abolished DST in 2022 |
| Mexico | Abolished mainland DST in 2022 |
| Brazil | Abolished DST in 2019 |

Per IANA: rules change frequently. Test against current
zoneinfo, not assumptions.

## Common bug classes

### Cron jobs

A "daily at 02:30" cron in `America/New_York`:

- Spring-forward day: **doesn't fire** (02:30 doesn't exist).
- Fall-back day: **fires twice** (02:30 EDT, then 02:30 EST).

Mitigation:
- Use UTC cron expressions when possible.
- For local-time business hours, accept the irregularity or
  schedule outside transition hours (04:00 is safe everywhere).
- Per [`qa-async-jobs/cron-job-test-author`](../../../qa-async-jobs/skills/cron-job-test-author/SKILL.md):
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

- Crosses DST boundary → still 09:00 local, but **2 minutes
  before or after the UTC equivalent** of the previous week.
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
[`timezone-test-matrix-builder`](../timezone-test-matrix-builder/SKILL.md),
the test matrix combines (zone, transition-type, library-version).

## Test data fixtures

Useful canonical timestamps per region (refresh against IANA):

| Region | Spring-forward 2026 | Fall-back 2026 |
|---|---|---|
| America/New_York | 2026-03-08 02:00 → 03:00 EDT | 2026-11-01 02:00 → 01:00 EST |
| Europe/London | 2026-03-29 01:00 → 02:00 BST | 2026-10-25 02:00 → 01:00 GMT |
| Australia/Sydney | 2026-10-04 02:00 → 03:00 AEDT | 2026-04-05 03:00 → 02:00 AEST |

These dates **change** year to year (some); commit a current
fixture and refresh annually.

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
- **Doesn't address leap seconds.** See
  [`leap-second-reference`](../leap-second-reference/SKILL.md).

## References

- IANA Time Zone Database:
  [www.iana.org/time-zones](https://www.iana.org/time-zones).
- Wikipedia DST:
  [en.wikipedia.org/wiki/Daylight_saving_time](https://en.wikipedia.org/wiki/Daylight_saving_time).
- Python zoneinfo:
  [docs.python.org/3/library/zoneinfo.html](https://docs.python.org/3/library/zoneinfo.html).
- Companion catalogs:
  [`leap-second-reference`](../leap-second-reference/SKILL.md),
  [`iso-8601-vs-rfc-3339-reference`](../iso-8601-vs-rfc-3339-reference/SKILL.md).
- Cross-plugin:
  [`qa-async-jobs/cron-job-test-author`](../../../qa-async-jobs/skills/cron-job-test-author/SKILL.md).
- Consumed by:
  [`libfaketime-c`](../libfaketime-c/SKILL.md),
  [`sinon-fake-timers-js`](../sinon-fake-timers-js/SKILL.md),
  [`jest-fake-timers`](../jest-fake-timers/SKILL.md),
  [`freezegun-python`](../freezegun-python/SKILL.md),
  [`timecop-ruby`](../timecop-ruby/SKILL.md),
  [`mockclock-jvm`](../mockclock-jvm/SKILL.md),
  [`timezone-test-matrix-builder`](../timezone-test-matrix-builder/SKILL.md).
