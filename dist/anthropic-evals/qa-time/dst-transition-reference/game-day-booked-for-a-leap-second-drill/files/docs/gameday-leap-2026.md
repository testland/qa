# Game day: leap second, 2026-12-31 23:59:60 UTC

Owner: M. Trethewey (platform SRE)
Game day: 2026-12-29, 14:00-16:00 UTC
Driver: external audit finding AUD-2026-11 ("no evidence of clock
discontinuity handling in latency reporting")

## Background as I understand it

A leap second is an extra second inserted at the end of a UTC day to keep
clocks lined up with the earth's rotation. 27 of them have gone in since 1972,
the most recent at the end of June 2015, and the next one lands at 23:59:60 UTC
on 31 December this year. Our hosts spread the extra second out across the day
rather than stepping the clock, so as far as `src/slaTimer.js` is concerned
nothing happens at all. I expect this to be a clean run.

## The four tests I want in the repo before Friday

1. **T1** - freeze the clock at `2026-12-31 23:59:59 UTC`, advance one second
   into `23:59:60`, and assert `elapsedMs` reports 1000.
2. **T2** - advance from `23:59:60` to `2027-01-01 00:00:00` and assert the
   timer reports another 1000, i.e. that the 61st second is counted.
3. **T3** - assert that `recordLatency` still classifies a 180ms call as within
   a 200ms budget while the clock is inside the inserted second.
4. **T4** - assert that a request which starts before the insertion and
   finishes after it never reports a negative `elapsedMs`.

## One-liner I want done while we are in there

Standard answer to any clock discontinuity is a monotonic clock, so let us just
use one everywhere in this module instead of `Date.now`:

```diff
-const wallClockMs = () => Date.now();
+const wallClockMs = () => performance.now();
```

One line, one source of time for the whole module, and it fixes the collector
merge for free - a monotonic reading never goes backwards, so sorting the three
regional batches on it can never put a row in the wrong order again. We had a
mess in August where the batches came back interleaved wrongly and nobody could
explain it. This makes that impossible by construction.

## Fallback if T4 fails

```diff
 function elapsedMs(timer) {
-  return timer.clock() - timer.startedAt;
+  const delta = timer.clock() - timer.startedAt;
+  return delta < 0 ? 0 : delta;
 }
```

One line, and it makes the negative case impossible by construction. I would
rather ship this than restructure the timer two days before the game day.

## What the auditors get

The four passing tests, the one-line clock change, plus a note that our
provider absorbs the second and a statement that no host in the fleet can
observe a clock discontinuity.
