# The worker replays what it missed and Ops wants that window widened to thirty days

## Problem Description

We moved the last five scheduled jobs off the old Java service onto the Node
worker. Dmitri did the port in July as a contractor, the Java service was
switched off on 28 August, and the properties file that carried its per-trigger
settings went with it - the class in `legacy/` is all that survived, and it
records what each job is for and nothing else. The port replaced whatever each
trigger did about a missed run with one setting for all five: the window in
`src/catchup.js`, which the worker uses at boot to replay what it missed while it
was down.

Last week we found out what that means. A bad deploy took the worker down from
the evening of the 8th to the morning of the 11th. It came back up and replayed
what it had missed inside the window, which is twenty-four hours. Tax reconciled
with the filing partner on Friday: the partner holds no VAT file for the 8th and
none for the 9th. Both were refiled by hand and there is a late-filing penalty
being argued about now.

Sandra has a PR open that raises the window from twenty-four hours to thirty days
so that nothing is ever lost again, and she has asked me to merge it before the
next deploy. On the face of it that is the same fix Tax is asking for. I would
rather somebody tested what the boot-time replay actually does to each of these
five jobs before it goes in, because two of them move money or mail customers and
I do not want to find out the way Tax did.

`test/catchup.test.js` is green and has been since the port.

## Output Specification

1. Add `test/replay.test.js` covering what a boot after an outage does to every
   job in `src/jobs.js`. Assert what the jobs are actually asked to do, not that
   the replay returned a count.
2. Write `docs/catch-up-policy.md`: a section per job saying what should happen
   to a run that the worker missed, what you set for it and why, and a direct
   answer on whether Sandra's thirty-day window should be merged.
3. Change `src/catchup.js` and `src/jobs.js` as your answer requires. Keep
   `missedSlots` and `replayMissed` callable the way they are called today.
4. Leave `test/catchup.test.js` passing unmodified. `npm test` must be green
   when you are done.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "scheduled-worker",
  "version": "0.8.4",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: legacy/SchedulerConfig.java ===============
package com.acme.scheduler;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The five triggers that ran on the Java service, with the interval each one
 * fired on. What each trigger did about a run it missed was configured per
 * trigger in scheduler.properties, which shipped with the service.
 */
public final class SchedulerConfig {

  public static final Map<String, Integer> INTERVAL_MINUTES = new LinkedHashMap<>();

  static {
    // One XML per period to the filing partner. Regulatory; every period must
    // be filed, and the partner holds one file per period.
    INTERVAL_MINUTES.put("vat-file-upload", 1440);

    // Posts the settlement batch for the period into the ledger.
    INTERVAL_MINUTES.put("payout-post", 1440);

    // Mails every customer whose invoice fell overdue in the period.
    INTERVAL_MINUTES.put("dunning-email", 1440);

    // Rebuilds the warehouse partition for the period from source.
    INTERVAL_MINUTES.put("metrics-rollup", 60);

    // Deletes sessions whose expiry has passed.
    INTERVAL_MINUTES.put("session-prune", 15);
  }

  private SchedulerConfig() {}
}

=============== FILE: src/periods.js ===============
'use strict';

// The period a run started at slotMs processes: the UTC calendar day before it.
function periodFor(slotMs) {
  return new Date(slotMs - 86400000).toISOString().slice(0, 10);
}

module.exports = { periodFor };

=============== FILE: src/catchup.js ===============
'use strict';

const CATCH_UP_WINDOW_MS = 24 * 60 * 60 * 1000;

// The slots this job should have fired on, after afterMs and up to nowMs.
function missedSlots(job, afterMs, nowMs) {
  const step = job.everyMinutes * 60000;
  const out = [];
  for (let t = afterMs + step; t <= nowMs; t += step) out.push(t);
  return out;
}

// Called once when the worker boots. run(job, slotMs) is the job body; slotMs is
// the instant the run was scheduled for, and the job takes its period from it.
function replayMissed(job, lastRunMs, nowMs, run) {
  const from = Math.max(lastRunMs, nowMs - CATCH_UP_WINDOW_MS);
  let replayed = 0;
  for (const slot of missedSlots(job, from, nowMs)) {
    if (slot > nowMs) break;
    run(job, Date.now());
    replayed += 1;
  }
  return replayed;
}

module.exports = { missedSlots, replayMissed, CATCH_UP_WINDOW_MS };

=============== FILE: src/jobs.js ===============
'use strict';

// everyMinutes is the interval the Java trigger fired on.
module.exports = [
  {
    name: 'vat-file-upload',
    everyMinutes: 1440,
    note: 'uploads one XML per period to the filing partner; the partner holds one file per period and returns 409 for a second',
  },
  {
    name: 'payout-post',
    everyMinutes: 1440,
    note: 'appends the settlement batch for the period to the ledger; nothing in the ledger is keyed on the period',
  },
  {
    name: 'dunning-email',
    everyMinutes: 1440,
    note: 'emails every customer whose invoice fell overdue in the period',
  },
  {
    name: 'metrics-rollup',
    everyMinutes: 60,
    note: 'rewrites the warehouse partition for the period from source',
  },
  {
    name: 'session-prune',
    everyMinutes: 15,
    note: 'deletes every session whose expiry has passed, whatever period it is handed',
  },
];

=============== FILE: test/catchup.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { missedSlots, replayMissed } = require('../src/catchup');
const jobs = require('../src/jobs');

const DAY = 24 * 60 * 60 * 1000;
const byName = (n) => jobs.find((j) => j.name === n);

// 2026-09-11 02:00 UTC - the boot after the September outage.
const BOOT = Date.UTC(2026, 8, 11, 2, 0);

test('missedSlots lists one slot per interval between two instants', () => {
  assert.equal(missedSlots(byName('vat-file-upload'), BOOT - 3 * DAY, BOOT).length, 3);
  assert.equal(missedSlots(byName('metrics-rollup'), BOOT - 6 * 3600000, BOOT).length, 6);
  assert.equal(missedSlots(byName('session-prune'), BOOT - 3600000, BOOT).length, 4);
});

test('a boot after a two-hour gap replays the rollup twice', () => {
  const calls = [];
  const n = replayMissed(byName('metrics-rollup'), BOOT - 2 * 3600000, BOOT, (j) => calls.push(j.name));
  assert.equal(n, 2);
  assert.deepEqual(calls, ['metrics-rollup', 'metrics-rollup']);
});

test('a boot with nothing missed replays nothing', () => {
  const calls = [];
  const n = replayMissed(byName('payout-post'), BOOT - 600000, BOOT, (j) => calls.push(j.name));
  assert.equal(n, 0);
  assert.deepEqual(calls, []);
});

=============== FILE: ops/outage-9104.md ===============
# Worker outage 8-11 September

- 2026-09-08 19:10 UTC - deploy of 0.8.4 wedged the worker on boot. Rolled back
  by hand on the 11th.
- 2026-09-11 02:00 UTC - worker back up. Boot-time replay ran.
- 2026-09-12 - Analytics raised a ticket about the warehouse partitions over the
  outage days. Open with platform, nobody has looked at it. Nobody has asked us
  about sessions at all.
- 2026-09-18 - Tax reconciled with the filing partner. No file held for the 8th
  and none for the 9th. Both refiled by hand; the partner has raised a
  late-filing penalty for the 8th and we are arguing it.
- The properties file that held the Java service's per-trigger behaviour for a
  missed run is not in the retention hold. Nobody wrote those settings down
  anywhere else, and the two people who would have known have left.

=============== FILE: ops/sandra-pr.md ===============
# PR 812 - widen the catch-up window

One line: `CATCH_UP_WINDOW_MS` goes from 24 hours to 30 days.

Reasoning. The outage lasted just under three days and the replay only covered
the last twenty-four hours of it, so two days of work was simply dropped on the
floor and Tax found out from the partner rather than from us. Thirty days covers
any outage we have ever had, including the four-day one in 2024, and the worker
already knows how to replay - it did it correctly for the slots that fell inside
the window. This is a one-constant change and I would like it in before Thursday's
deploy so we are covered for the next one.
