# qa-time-and-timezones

Time-related testing: fake-clock libraries (libfaketime, sinon-fake-timers, jest-fake-timers, freezegun, timecop, mockclock), DST + leap-second references, ISO-8601 vs RFC 3339 reference, and a timezone test matrix builder. Covers time-based bugs (DST transitions, leap seconds, timezone arithmetic, clock skew) which are high-incident-rate but specific tooling is scattered.

## Components

| Type | Name | Description |
| --- | --- | --- |
| (filled in as components are added) |  |  |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-time-and-timezones@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
