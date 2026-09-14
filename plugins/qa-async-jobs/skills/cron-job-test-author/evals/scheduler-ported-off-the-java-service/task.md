# The worker replays what it missed and Ops wants that window widened to thirty days

## Problem Description

We moved the last five scheduled jobs off the old Java service onto the Node
worker. Dmitri did the port in July as a contractor, the Java service was
switched off on 28 August, and the properties file that carried its per-trigger
settings went with it - the class in `legacy/` is all that survived, and it
records the interval each trigger fired on and nothing else. The port replaced
whatever each trigger did about a missed run with one setting for all five: the
window in `src/catchup.js`, which the worker uses at boot to replay what it
missed while it was down.

Last week we found out what that means. A bad deploy took the worker down from
the evening of the 8th to the morning of the 11th. It came back up and replayed
what it had missed inside the window, which is twenty-four hours. Tax reconciled
with the filing partner on Friday: the partner holds no VAT file for the 8th and
none for the 9th. Both were refiled by hand and there is a late-filing penalty
being argued about now.

Sandra has a PR open that raises the window from twenty-four hours to thirty
days so that nothing is ever lost again, and she has asked me to merge it before
Thursday's deploy. On the face of it that is the same fix Tax is asking for.
What I want before it goes in is somebody to test what a boot after an outage
actually does to each of these five jobs - the job bodies are in
`src/handlers.js` and the adapters they call are in `src/io.js` - because some of
them move money or mail customers and I do not want to find out the way Tax did.

`test/catchup.test.js` is green and has been since the port.

## Output Specification

1. Add `test/replay.test.js` covering what a boot after an outage does to every
   job in `src/jobs.js`. Cover the arrangement you are proposing, not only the
   one that shipped.
2. Write `docs/catch-up-policy.md`: a section per job saying what should happen
   to a run the worker missed, what you set for it and why, and a direct answer
   on whether Sandra's thirty-day window should be merged.
3. Change `src/catchup.js`, `src/boot.js` and `src/jobs.js` as your answer
   requires. Keep `missedSlots`, `replayMissed` and `bootReplay` callable the way
   `test/catchup.test.js` calls them.
4. Leave `src/handlers.js` and `src/io.js` alone - they are the job bodies and
   the adapters in front of the partner, the ledger and the mail vendor, and
   none of those schemas is ours to change this week. Leave
   `test/catchup.test.js` passing unmodified. `npm test` must be green when you
   are done.

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
    INTERVAL_MINUTES.put("vat-file-upload", 1440);
    INTERVAL_MINUTES.put("payout-post", 1440);
    INTERVAL_MINUTES.put("dunning-email", 1440);
    INTERVAL_MINUTES.put("metrics-rollup", 60);
    INTERVAL_MINUTES.put("session-prune", 15);
  }

  private SchedulerConfig() {}
}

=============== FILE: src/jobs.js ===============
'use strict';

// everyMinutes is the interval the Java trigger fired on. What each job does is
// in src/handlers.js.
module.exports = [
  { name: 'vat-file-upload', everyMinutes: 1440 },
  { name: 'payout-post', everyMinutes: 1440 },
  { name: 'dunning-email', everyMinutes: 1440 },
  { name: 'metrics-rollup', everyMinutes: 60 },
  { name: 'session-prune', everyMinutes: 15 },
];

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

// Called once when the worker boots, per job. run(job, atMs) is the job body.
function replayMissed(job, lastRunMs, nowMs, run) {
  const from = Math.max(lastRunMs, nowMs - CATCH_UP_WINDOW_MS);
  let replayed = 0;
  for (const slot of missedSlots(job, from, nowMs)) {
    if (slot > nowMs) break;
    run(job, nowMs);
    replayed += 1;
  }
  return replayed;
}

module.exports = { missedSlots, replayMissed, CATCH_UP_WINDOW_MS };

=============== FILE: src/handlers.js ===============
'use strict';

// The period a run covers: the UTC calendar day before the instant it is given.
function periodFor(atMs) {
  return new Date(atMs - 86400000).toISOString().slice(0, 10);
}

function handlersFor(io) {
  return {
    'vat-file-upload': (atMs) => io.partner.putFile(periodFor(atMs), `vat-${periodFor(atMs)}.xml`),
    'payout-post': (atMs) =>
      io.ledger.append({ kind: 'settlement', period: periodFor(atMs), cents: io.settlementCents(periodFor(atMs)) }),
    'dunning-email': (atMs) => {
      for (const customer of io.overdueOn(periodFor(atMs))) io.mailer.send(customer, `overdue ${periodFor(atMs)}`);
    },
    'metrics-rollup': (atMs) => io.warehouse.writePartition(periodFor(atMs), io.factsFor(periodFor(atMs))),
    'session-prune': (atMs) => io.sessions.deleteExpired(atMs),
  };
}

module.exports = { handlersFor, periodFor };

=============== FILE: src/io.js ===============
'use strict';

// A snapshot of the outage window, pulled out of prod for the tests.
const SAMPLE = {
  settlements: {
    '2026-09-07': 4180233,
    '2026-09-08': 3992104,
    '2026-09-09': 4410770,
    '2026-09-10': 4077615,
  },
  overdue: {
    '2026-09-07': ['c-101', 'c-102'],
    '2026-09-08': ['c-101', 'c-102'],
    '2026-09-09': ['c-101', 'c-102'],
    '2026-09-10': ['c-101', 'c-102'],
  },
  facts: {
    '2026-09-07': 118204,
    '2026-09-08': 121553,
    '2026-09-09': 119870,
    '2026-09-10': 124011,
  },
  sessions: {
    's-1': Date.UTC(2026, 8, 9, 4, 0),
    's-2': Date.UTC(2026, 8, 10, 4, 0),
    's-3': Date.UTC(2026, 8, 11, 1, 0),
    's-4': Date.UTC(2026, 8, 12, 4, 0),
  },
};

// The worker binds the real adapters at boot; the tests bind these.
function createIo(seed = SAMPLE) {
  return {
    partner: {
      held: new Map(),
      calls: [],
      putFile(period, name) {
        this.calls.push({ period, name });
        if (this.held.has(period)) return { status: 409, period };
        this.held.set(period, name);
        return { status: 201, period };
      },
    },
    ledger: {
      entries: [],
      append(entry) {
        this.entries.push(entry);
        return this.entries.length;
      },
    },
    mailer: {
      sent: [],
      send(customer, subject) {
        this.sent.push({ customer, subject });
      },
    },
    warehouse: {
      writes: 0,
      partitions: new Map(),
      writePartition(period, rows) {
        this.writes += 1;
        this.partitions.set(period, rows);
      },
    },
    sessions: {
      live: new Map(Object.entries(seed.sessions || {})),
      deleteExpired(atMs) {
        let removed = 0;
        for (const [id, expiresAt] of this.live) {
          if (expiresAt <= atMs) {
            this.live.delete(id);
            removed += 1;
          }
        }
        return removed;
      },
    },
    settlementCents: (period) => (seed.settlements || {})[period] || 0,
    overdueOn: (period) => (seed.overdue || {})[period] || [],
    factsFor: (period) => (seed.facts || {})[period] || 0,
  };
}

module.exports = { createIo, SAMPLE };

=============== FILE: src/state.js ===============
'use strict';

// Last successful run per job, as the worker recorded it before the outage.
module.exports = {
  'vat-file-upload': Date.UTC(2026, 8, 8, 0, 0),
  'payout-post': Date.UTC(2026, 8, 8, 1, 0),
  'dunning-email': Date.UTC(2026, 8, 8, 6, 0),
  'metrics-rollup': Date.UTC(2026, 8, 8, 19, 0),
  'session-prune': Date.UTC(2026, 8, 8, 19, 0),
};

=============== FILE: src/boot.js ===============
'use strict';

const { replayMissed } = require('./catchup');
const { handlersFor } = require('./handlers');
const jobs = require('./jobs');
const lastRun = require('./state');

// Runs once when the worker starts, before the schedule loop takes over.
function bootReplay(io, nowMs, lastRunMs = lastRun) {
  const handlers = handlersFor(io);
  const replayed = {};
  for (const job of jobs) {
    replayed[job.name] = replayMissed(job, lastRunMs[job.name], nowMs, (j, atMs) => handlers[j.name](atMs));
  }
  return replayed;
}

module.exports = { bootReplay };

=============== FILE: test/catchup.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { missedSlots, replayMissed } = require('../src/catchup');
const { bootReplay } = require('../src/boot');
const { createIo } = require('../src/io');
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

test('the boot replay reports every job', () => {
  const replayed = bootReplay(createIo(), BOOT);
  assert.deepEqual(Object.keys(replayed), jobs.map((j) => j.name));
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

=============== FILE: ops/partner-log.txt ===============
# Filing partner API log for our account, sent by their support on request.
# All times UTC. Period is taken from the document, not from the call.

2026-09-07T00:00:02Z  PUT /filings/vat  201 accepted   period 2026-09-06
2026-09-08T00:00:02Z  PUT /filings/vat  201 accepted   period 2026-09-07
2026-09-11T02:00:03Z  PUT /filings/vat  201 accepted   period 2026-09-10
2026-09-12T00:00:02Z  PUT /filings/vat  201 accepted   period 2026-09-11
2026-09-13T00:00:01Z  PUT /filings/vat  201 accepted   period 2026-09-12

# Their note: a second document for a period we already hold is rejected 409 and
# is not stored. Nothing is queued; the call either lands or it does not.

=============== FILE: ops/sandra-pr.md ===============
# PR 812 - widen the catch-up window

One line: `CATCH_UP_WINDOW_MS` goes from 24 hours to 30 days.

Reasoning. The outage lasted just under three days and the replay only covered
the last twenty-four hours of it, so two days of work was dropped on the floor
and Tax found out from the partner rather than from us. Thirty days covers any
outage we have ever had, including the four-day one in 2024, and the worker
already knows how to replay - it did it correctly for the slot that fell inside
the window. This is a one-constant change and I would like it in before
Thursday's deploy so we are covered for the next one.
