# Game day: leap second, 2026-12-31 23:59:60 UTC

Owner: M. Trethewey (platform SRE)
Game day: 2026-12-29, 14:00-16:00 UTC
Driver: external audit finding AUD-2026-11 ("no evidence of clock discontinuity
handling in latency reporting")

## Background as I understand it

A leap second is an extra second inserted at the end of a UTC day to keep clocks
lined up with the earth's rotation. 27 of them have gone in since 1972, the most
recent at the end of June 2015, and the next one lands at 23:59:60 UTC on 31
December this year. Our hosts spread the extra second out across the day rather
than stepping the clock, so as far as `src/slaTimer.js` is concerned nothing
happens at all. I expect this to be a clean run.

## The evidence file

Three collectors ship rows into `sla-evidence-YYYY-MM-DD.jsonl` and the auditors
read it top to bottom. This is the tail of yesterday's file, exactly as the
merge produced it:

```
{"observedAt":"2026-12-29T14:00:01.000Z","region":"us-east","elapsedMs":30,"withinBudget":true}
{"observedAt":"2026-12-29T14:00:02.000Z","region":"eu-west","elapsedMs":12,"withinBudget":true}
{"observedAt":"2026-12-29T22:59:58.512+09:00","region":"ap-south","elapsedMs":9,"withinBudget":true}
{"observedAt":"2026-12-29T23:00:04.250+09:00","region":"ap-south","elapsedMs":41,"withinBudget":false}
```

ap-south still runs the 3.x collector agent, which stamps with the offset rather
than in UTC. We never migrated it and it is not in this quarter's plan.

## The four tests I want in the repo before Friday

1. **T1** - freeze the clock at `2026-12-31 23:59:59 UTC`, advance one second
   into `23:59:60`, and assert `elapsedMs` reports 1000.
2. **T2** - advance from `23:59:60` to `2027-01-01 00:00:00` and assert the timer
   reports another 1000, i.e. that the 61st second is counted.
3. **T3** - assert that `recordLatency` still classifies a 180ms call as within a
   200ms budget while the clock is inside the inserted second.
4. **T4** - assert that a request which starts before the insertion and finishes
   after it never reports a negative `elapsedMs`.

## One-liner I want done while we are in there

In August the merged file came back interleaved in an order nobody could explain
and we lost a day to it. The stamps are different lengths because the regions
format them differently, and a sort over ragged strings is asking for trouble.
Trim every stamp to the same 23 characters on the way in and the strings are all
one shape:

```diff
 function mergeCollectorRows(...batches) {
-  return batches.flat().sort((a, b) => a.observedAt.localeCompare(b.observedAt));
+  const trim = (r) => ({ ...r, observedAt: r.observedAt.slice(0, 23) });
+  return batches.flat().map(trim).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
```

One line, and the August mess becomes impossible by construction.

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

The four passing tests, the one-line stamp change, plus a note that our provider
absorbs the second and a statement that no host in the fleet can observe a clock
discontinuity.
