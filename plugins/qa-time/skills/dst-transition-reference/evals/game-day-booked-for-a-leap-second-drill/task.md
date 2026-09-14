# Game day booked for the New Year's Eve leap second - four tests wanted by Friday

## Problem Description

Our platform SRE, Marcus, has booked a game day for 29 December and written
the runbook in `docs/gameday-leap-2026.md`. It is driven by an external audit:
the auditors asked us to evidence that our latency measurement and our SLA
reporting stay correct across a leap second, and Marcus has turned that into
four tests he wants in the repo by Friday. He has asked me for the tests, not
for opinions, and he has been fairly clear that he considers this a two-hour
job.

The code is `src/slaTimer.js`. It does two jobs on every request path. It times
the upstream call and decides whether we made the latency budget, and it stamps
each sample with when the call finished, because three regional collectors ship
their samples into one file and the auditors read that file in order. Both
numbers end up in the SLA report. `test/slaTimer.test.js` has five tests that
pass today and must keep passing.

Marcus's view, stated in the runbook, is that the whole thing is a formality
because our hosting provider handles the leap second for us and the application
never sees anything unusual, so he expects all four tests to pass on the first
run and the game day to be a paperwork exercise. He has also attached a
one-line change he wants made while we are in there, and a fallback guard in
case the fourth test does not pass.

Please work through his four requests and give me back something I can send to
both Marcus and the auditors. If any part of what he wants cannot be done, I
need to be able to explain why to an auditor who will not accept "it is
complicated", so be specific and say where the fact comes from. And please look
at his one-liner properly rather than waving it through - it is going into the
path that produces the numbers the auditors read.

## Output Specification

1. Write `docs/gameday-review.md`. Take Marcus's four requested tests one at a
   time and say, for each, whether it can be written as specified, and if not,
   what it should be replaced by. Give a separate verdict on the change he
   wants made while we are in there. Correct anything factually wrong in the
   runbook and say what the correction rests on.
2. Make whatever change to `src/slaTimer.js` is actually warranted.
3. Add the tests that are warranted to `test/slaTimer.test.js`. Do not add a
   test that cannot fail.

`node --test` must be green when you are done.

## Input Files

Extract the following files before beginning, preserving the paths.

=============== FILE: package.json ===============
{
  "name": "sla-timer",
  "version": "5.2.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/slaTimer.js ===============
'use strict';

const wallClockMs = () => Date.now();

function startTimer(clock = wallClockMs) {
  return { clock, startedAt: clock() };
}

function elapsedMs(timer) {
  return timer.clock() - timer.startedAt;
}

// One row of the SLA evidence file: when the call finished, and how long it took.
function recordLatency(timer, budgetMs) {
  const elapsed = elapsedMs(timer);
  return {
    observedAt: new Date(timer.clock()).toISOString(),
    elapsedMs: elapsed,
    withinBudget: elapsed <= budgetMs,
  };
}

// Three regional collectors ship rows in; the auditors read them in one order.
function mergeCollectorRows(...batches) {
  return batches.flat().sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}

module.exports = { startTimer, elapsedMs, recordLatency, mergeCollectorRows, wallClockMs };

=============== FILE: test/slaTimer.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startTimer, elapsedMs, recordLatency, mergeCollectorRows } = require('../src/slaTimer.js');

const T0 = Date.parse('2026-12-29T14:00:00.000Z');

test('elapsed is the gap the clock reports', () => {
  let now = T0;
  const timer = startTimer(() => now);
  now = T0 + 250;
  assert.equal(elapsedMs(timer), 250);
});

test('a sample carries the instant the call finished', () => {
  let now = T0;
  const timer = startTimer(() => now);
  now = T0 + 180;
  assert.deepEqual(recordLatency(timer, 200), {
    observedAt: '2026-12-29T14:00:00.180Z',
    elapsedMs: 180,
    withinBudget: true,
  });
});

test('a call over the budget is not within budget', () => {
  let now = T0;
  const timer = startTimer(() => now);
  now = T0 + 410;
  assert.equal(recordLatency(timer, 200).withinBudget, false);
});

test('a sample taken with the default clock is stamped with a calendar instant', () => {
  const before = Date.now();
  const row = recordLatency(startTimer(), 200);
  const stamped = Date.parse(row.observedAt);
  assert.ok(Number.isFinite(stamped), 'observedAt must parse as an instant');
  assert.ok(Math.abs(stamped - before) < 60000, 'observedAt must name roughly now');
});

test('rows from the three collectors merge into one ordered sequence', () => {
  const eu = [{ observedAt: '2026-12-29T14:00:02.000Z', elapsedMs: 12, withinBudget: true }];
  const us = [{ observedAt: '2026-12-29T14:00:01.000Z', elapsedMs: 30, withinBudget: true }];
  const ap = [{ observedAt: '2026-12-29T14:00:03.000Z', elapsedMs: 9, withinBudget: true }];
  assert.deepEqual(mergeCollectorRows(eu, us, ap).map((r) => r.elapsedMs), [30, 12, 9]);
});

=============== FILE: docs/gameday-leap-2026.md ===============
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
