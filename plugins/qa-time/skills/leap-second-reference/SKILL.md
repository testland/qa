---
name: leap-second-reference
description: "Pure-reference catalog of leap-second mechanics + their bug surface. Defines leap seconds (occasional 23:59:60 UTC second insertions announced by IERS to keep UTC within 0.9s of UT1), the history (added irregularly since 1972 by IERS Bulletin C; 27 added by 2024; will be ABOLISHED by 2035 per CGPM resolution), the leap-smear alternative (Google's linear 24-hour smear; AWS uses similar), and the testable behaviors (POSIX time_t conventions, NTP behaviour, distributed-systems clock-skew during a leap event). Use when designing time-sensitive systems or auditing assumptions about second-by-second progress."
rating: 22
d6: 4
---

# leap-second-reference

## Overview

A **leap second** is an extra second (23:59:60 UTC) inserted
into the day to keep UTC within 0.9 seconds of UT1 (astronomical
time). Per IERS Bulletin C
([iers.org](https://www.iers.org/IERS/EN/Publications/Bulletins/bulletins.html)),
leap seconds are announced ~6 months in advance.

**Important - 2035 abolition:** Per the 27th CGPM resolution
(2022), leap seconds will be **abolished** by 2035, with the
gap between UTC and UT1 allowed to grow. Existing leap seconds
(27 inserted between 1972 and 2024) remain in the historical
record.

## When to use

- Designing systems where second-by-second progress matters
  (financial timestamping, distributed logs, NTP-sensitive code).
- Auditing assumptions about `time_t` monotonicity.
- Testing behaviour around announced leap-second events.

## The mechanics

| Property | Detail |
|---|---|
| Frequency | Irregular; announced by IERS Bulletin C |
| Insertion point | Last second of UTC June 30 or December 31 |
| Direction | Almost always +1 (insert); the spec allows -1 but never used |
| Wire format | 23:59:60 UTC (a real 61st second of the minute) |
| POSIX time_t | **Does not include** leap seconds; time_t jumps backward by 1 or stalls |
| NTP | NTP messages signal upcoming leap; clients handle it differently |

## Leap-smear

Per Google's "Time, technology and leaping seconds":
[cloud.google.com/blog/products/gcp/leap-second](https://cloud.google.com/blog/products/gcp/leap-second-2016-smear),
Google "smears" the leap second across the 24 hours
surrounding it - adding a small fraction to each second so the
total adds up to 1 second of slowdown, with no actual 23:59:60.

```
Leap second strategy comparison:

| Approach              | What happens                       |
|-----------------------|------------------------------------|
| IERS spec             | 23:59:60 UTC inserted (real second)|
| Linux kernel default  | Real insertion; time_t stalls 1s  |
| Google leap-smear     | Distributed over 24h               |
| AWS leap-smear        | Linear over 24h                    |
| NTP "step"            | Jump 1s; subsequent time_t differs |
```

The smear is operationally invisible to applications; the spec
exposes the discontinuity.

## Historical leap seconds

Per IERS, 27 leap seconds were inserted between 1972 and 2024.
Most recent: 2016-12-31 23:59:60 UTC. None added 2017-2024.
None expected before 2035 abolition.

## Bug classes

### `time_t` non-monotonicity

POSIX `time_t` is defined as seconds since epoch with **86400
seconds per day** - no leap seconds. On a leap-second insertion,
the system clock either:

1. **Steps**: time_t goes 1483228799 → 1483228799 (stalls) →
   1483228800.
2. **Jumps**: time_t goes 1483228799 → 1483228800 (no real 1s
   wait between).
3. **Smears**: time_t increments smoothly but slow over 24h.

Code that relies on "1 second of CPU time = 1 second of clock"
breaks.

### Negative durations

```python
start = time.time()
do_work()    # crosses a leap second
elapsed = time.time() - start
assert elapsed >= 0   # FAILS on a real-inserted leap second
```

Use **monotonic clocks** (`time.monotonic()`, `clock_gettime(CLOCK_MONOTONIC)`)
for duration measurement. Monotonic clocks ignore wall-clock
leap-second insertions.

### NTP cascading

NTP messages carry a leap-second indicator. Different OS
versions handle the indicator differently - Linux historically
had bugs where the leap insertion caused kernel hangs (2012
incident).

### Distributed-systems clock skew

If different nodes handle leap differently (one steps, one
smears), clock skew between them temporarily exceeds 1 second.
Per AWS docs ([aws.amazon.com/blogs/aws/look-before-you-leap-the-coming-leap-second-and-aws](https://aws.amazon.com/blogs/aws/look-before-you-leap-the-coming-leap-second-and-aws)),
AWS uses leap-smear specifically to avoid this.

## Testable behaviours

| Behaviour | Test |
|---|---|
| Duration calculation uses monotonic clock | `time.monotonic()` consistent across leap |
| Sortable timestamps don't collide | Even with stalled `time_t`, sequence-numbers / nanosecond resolution avoids equal timestamps |
| Log timestamps don't skew | Compare logs across services during a known leap event |
| Cron jobs at `00:00:00 UTC` of leap day | Fires exactly once |
| Financial timestamping | Per-trade microsecond resolution + monotonic counter |

### Simulating a leap second in tests

```python
# Override the system clock to simulate
import freezegun

@freezegun.freeze_time('2016-12-31 23:59:59 UTC')
def test_leap_handling():
    t1 = time.time()
    time_pass_one_second()  # mock
    t2 = time.time()
    assert t2 - t1 == 1     # ideal; on real leap = 0 (stalled)
```

Note: most test libraries don't simulate **actual** leap-second
mechanics - they're a real OS-level event. Production tests
require an OS test that replays NTP leap-second indication.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `time.time() - start` for duration | Wall-clock; affected by leap | Use `time.monotonic()` |
| Asserting `time.time() < time.time()` adjacent calls | Trips on stalled time_t | Use sequence numbers + monotonic |
| Treating UNIX time_t as continuous | Historical leap insertions broke this | Per
  [www.epochconverter.com/leap-seconds](https://www.epochconverter.com/leap-seconds) |
| No monitoring during announced leap | Latent bugs surface in prod | Pre-leap rehearsal + monitoring |
| Per-second metrics with stale timestamps | Loss of one second of data | Sub-second granularity |
| Hardcoding 86400 in "seconds-per-day" | True only sometimes | Calendar arithmetic |
| Assuming all servers smear | Some don't | Verify per-host strategy |

## Limitations

- **Leap seconds are being abolished.** Per CGPM 2022, post-2035
  this entire surface goes away. New systems should still handle
  historical-data leap seconds.
- **OS / runtime behaviour varies.** Tests can't perfectly
  simulate without OS cooperation.
- **27 leap seconds happened over 52 years.** Real-world test
  data is rare; rely on standard reference data.
- **Some clock libraries smooth past leap events.** Library
  documentation may not state behaviour explicitly.

## References

- IERS Bulletin C (leap-second announcements):
  [iers.org/IERS/EN/Publications/Bulletins/bulletins.html](https://www.iers.org/IERS/EN/Publications/Bulletins/bulletins.html).
- Wikipedia leap second:
  [en.wikipedia.org/wiki/Leap_second](https://en.wikipedia.org/wiki/Leap_second).
- Google leap-smear:
  [cloud.google.com/blog/products/gcp/leap-second-2016-smear](https://cloud.google.com/blog/products/gcp/leap-second-2016-smear).
- AWS leap-smear:
  [aws.amazon.com/blogs/aws/look-before-you-leap-the-coming-leap-second-and-aws](https://aws.amazon.com/blogs/aws/look-before-you-leap-the-coming-leap-second-and-aws).
- Companion catalog:
  [`dst-transition-reference`](../dst-transition-reference/SKILL.md).
- Consumed by:
  [`libfaketime-c`](../libfaketime-c/SKILL.md),
  [`freezegun-python`](../freezegun-python/SKILL.md),
  [`mockclock-jvm`](../mockclock-jvm/SKILL.md),
  [`timezone-test-matrix-builder`](../timezone-test-matrix-builder/SKILL.md).
