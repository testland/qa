# qa-time

Time-related testing: one fake-clock umbrella covering every mainstream
runtime (freezegun, Jest + Sinon fake timers, timecop, JVM Clock injection,
.NET TimeProvider, libfaketime), a DST + leap-second reference, a timezone
test-matrix builder, and an adversarial time-handling critic. Covers
time-based bugs (DST transitions, leap seconds, timezone arithmetic, clock
skew) which are high-incident-rate but specific tooling is scattered.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [fake-clock-testing](skills/fake-clock-testing/SKILL.md) | Fake clocks / freeze time in tests: the language-agnostic discipline plus per-library recipes (freezegun, Jest/Sinon fake timers, timecop, `java.time.Clock`, .NET `TimeProvider`, libfaketime) in references/. |
| Skill | [dst-transition-reference](skills/dst-transition-reference/SKILL.md) | Pure reference: DST transition bug classes; leap-second mechanics in references/. |
| Skill | [timezone-test-matrix-builder](skills/timezone-test-matrix-builder/SKILL.md) | Build-an-X timezone + DST + leap test matrix from a code-base inventory. |
| Agent | [time-handling-critic](agents/time-handling-critic.md) | Adversarial critic: scans diffs for naive time anti-patterns (naive now(), DST-unsafe construction, offset-free storage) and emits BLOCK/PASS. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-time@testland-qa
```
