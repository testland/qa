---
name: leap-second-reference
description: "Pure-reference catalog of leap-second mechanics and the bugs they cause: the 23:59:60 UTC insertion (announced ~6 months ahead by IERS Bulletin C; 27 inserted 1972-2016; abolished by 2035 per CGPM 2022), the Google/AWS leap-smear alternative, and the four bug classes a real insertion exposes - time_t non-monotonicity, negative durations, NTP cascading, and cross-node clock skew - each with a monotonic-clock fix and a freezegun simulation. Use when auditing time-sensitive code (financial timestamping, distributed logs, NTP-driven schedulers) for second-by-second progress assumptions; for the far more common daylight-saving-time transition hazards, use dst-transition-reference instead."
---

# leap-second-reference

## Overview

A **leap second** is an extra second (23:59:60 UTC) inserted
into the day to keep UTC within 0.9 seconds of UT1 (astronomical
time). Per IERS Bulletin C
([datacenter.iers.org/data/latestVersion/bulletinC.txt](https://datacenter.iers.org/data/latestVersion/bulletinC.txt)),
Bulletin C is issued every six months, either to announce a time
step in UTC or to confirm that there will be no step at the next
possible date - so a leap second gets roughly six months of
notice.

**Important - 2035 abolition:** Per the 27th CGPM resolution
(2022), leap seconds will be **abolished** by 2035, with the
gap between UTC and UT1 allowed to grow. Existing leap seconds
(27 inserted between 1972 and 2026) remain in the historical
record.

## How to use this reference

1. **Decide whether second-granular progress matters** to the code
   (financial timestamping, distributed logs, NTP-sensitive paths).
   If not, this surface is mostly irrelevant.
2. **Locate the exposed bug class** below (`time_t`
   non-monotonicity, negative durations, NTP cascading, distributed
   clock skew).
3. **Apply the fix and assert it** - monotonic clocks for durations,
   sub-second ordering keys for sortable timestamps - against the
   matching row in the testable-behaviours table (see the worked
   example).
4. **Confirm the host absorption strategy** (real insertion vs
   leap-smear) from
   [references/smear-strategies-and-history.md](references/smear-strategies-and-history.md)
   before assuming any two nodes agree during a leap event.

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

## Absorption strategy and history

Whether a host inserts a real 23:59:60 or **smears** the second over
24 hours (Google / AWS), plus the full record of the 27 leap seconds
inserted between 1972 and 2026 (most recent 2016-12-31), lives in
[references/smear-strategies-and-history.md](references/smear-strategies-and-history.md).
The smear is operationally invisible to applications; a real
insertion exposes the discontinuity that the bug classes below
exploit.

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

## Worked example - a negative-duration assertion

Goal: prove a duration-measurement code path stays non-negative across a
real-inserted leap second.

1. Pick the bug class: **negative durations**. A path that measures elapsed
   time with `time.time() - start` can return a value below zero when the
   wall clock stalls or steps back on a leap-second insertion (the
   negative-durations snippet above).
2. Apply the fix: swap the wall clock for a **monotonic clock** -
   `time.monotonic()` (or `clock_gettime(CLOCK_MONOTONIC)`) - which ignores
   wall-clock leap-second insertions.
3. Write the assertion against the "Duration calculation uses monotonic
   clock" row of the testable-behaviours table: elapsed stays monotonic and
   non-negative across the leap.

   ```python
   start = time.monotonic()
   do_work()                     # crosses 2016-12-31 23:59:60 UTC
   elapsed = time.monotonic() - start
   assert elapsed >= 0           # holds; the time.time() version can trip
   ```
4. Simulate it with the freezegun harness above: pin the clock to the most
   recent real leap second (`freeze_time('2016-12-31 23:59:59 UTC')`) and
   advance across the inserted second. The monotonic assertion holds where
   the wall-clock form (`t2 - t1 == 1`) reads 0 on a stalled `time_t`.

The caveat from "Simulating a leap second in tests" still applies: freezegun
can't replay the OS-level leap indication, so this asserts the code's clock
choice, not the kernel's leap behaviour - a real leap needs an OS-level test.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `time.time() - start` for duration | Wall-clock; affected by leap | Use `time.monotonic()` |
| Asserting `time.time() < time.time()` adjacent calls | Trips on stalled time_t | Use sequence numbers + monotonic |
| Treating UNIX time_t as continuous | Historical leap insertions broke this | Per
  [IANA leap-seconds.list](https://data.iana.org/time-zones/data/leap-seconds.list) |
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
- **27 leap seconds happened over 54 years.** Real-world test
  data is rare; rely on standard reference data.
- **Some clock libraries smooth past leap events.** Library
  documentation may not state behaviour explicitly.

## References

- IERS Bulletin C (leap-second announcements), latest issue:
  [datacenter.iers.org/data/latestVersion/bulletinC.txt](https://datacenter.iers.org/data/latestVersion/bulletinC.txt);
  full archive of every issue:
  [datacenter.iers.org/availableVersions.php?id=16](https://datacenter.iers.org/availableVersions.php?id=16).
- Wikipedia leap second:
  [en.wikipedia.org/wiki/Leap_second](https://en.wikipedia.org/wiki/Leap_second).
- Google leap-smear:
  [googleblog.blogspot.com/2011/09/time-technology-and-leaping-seconds.html](https://googleblog.blogspot.com/2011/09/time-technology-and-leaping-seconds.html),
  [developers.google.com/time/smear](https://developers.google.com/time/smear).
- AWS leap-smear:
  [aws.amazon.com/blogs/aws/look-before-you-leap-the-coming-leap-second-and-aws](https://aws.amazon.com/blogs/aws/look-before-you-leap-the-coming-leap-second-and-aws).
- Deep reference (with its own citations): leap-smear strategies +
  historical record in [references/smear-strategies-and-history.md](references/smear-strategies-and-history.md).
- Companion catalog:
  `dst-transition-reference`.
- Consumed by:
  `libfaketime-c`,
  `freezegun-python`,
  `mockclock-jvm`,
  `timezone-test-matrix-builder`.
