# qa-time-and-timezones

Time-related testing: fake-clock libraries (libfaketime, sinon-fake-timers, jest-fake-timers, freezegun, timecop, mockclock), DST + leap-second references, ISO-8601 vs RFC 3339 reference, and a timezone test matrix builder. Covers time-based bugs (DST transitions, leap seconds, timezone arithmetic, clock skew) which are high-incident-rate but specific tooling is scattered.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [freezegun-python](skills/freezegun-python/SKILL.md) | freezegun Python time-mocking: `@freeze_time` decorator / context manager. |
| Skill | [jest-fake-timers](skills/jest-fake-timers/SKILL.md) | Jest modern fake timers: `useFakeTimers` / `setSystemTime`. |
| Skill | [sinon-fake-timers-js](skills/sinon-fake-timers-js/SKILL.md) | `@sinonjs/fake-timers`: install / tick / setSystemTime. |
| Skill | [timecop-ruby](skills/timecop-ruby/SKILL.md) | timecop gem: `Timecop.freeze` / `travel` / `scale`. |
| Skill | [mockclock-jvm](skills/mockclock-jvm/SKILL.md) | `java.time.Clock` / `InstantSource` dependency injection (`Clock.fixed`). |
| Skill | [libfaketime-c](skills/libfaketime-c/SKILL.md) | libfaketime `LD_PRELOAD` time interception for any binary. |
| Skill | [dst-transition-reference](skills/dst-transition-reference/SKILL.md) | Pure reference: DST transition bug classes. |
| Skill | [leap-second-reference](skills/leap-second-reference/SKILL.md) | Pure reference: leap-second mechanics and bug surface. |
| Skill | [iso-8601-vs-rfc-3339-reference](skills/iso-8601-vs-rfc-3339-reference/SKILL.md) | Pure reference: ISO 8601 vs RFC 3339 distinction. |
| Skill | [timezone-test-matrix-builder](skills/timezone-test-matrix-builder/SKILL.md) | Build-an-X timezone + DST + leap test matrix from a code-base inventory. |
| Agent | [time-handling-critic](agents/time-handling-critic.md) | Adversarial critic: scans diffs for naive time anti-patterns (naive now(), DST-unsafe construction, offset-free storage) and emits BLOCK/PASS. |
| Skill | [dotnet-faketime](skills/dotnet-faketime/SKILL.md) | .NET TimeProvider / FakeTimeProvider fake-clock for time-dependent tests. |

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
rubric.
