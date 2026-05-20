# qa-time-and-timezones

Time-related testing: fake-clock libraries (libfaketime, sinon-fake-timers, jest-fake-timers, freezegun, timecop, mockclock), DST + leap-second references, ISO-8601 vs RFC 3339 reference, and a timezone test matrix builder. Covers time-based bugs (DST transitions, leap seconds, timezone arithmetic, clock skew) which are high-incident-rate but specific tooling is scattered.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| (filled in as components are added) | | | |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-time-and-timezones@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
