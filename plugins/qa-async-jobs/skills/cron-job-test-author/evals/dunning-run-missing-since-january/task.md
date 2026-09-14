# Dunning has not gone out since January and the schedule audit is still green

## Problem Description

`billing-worker` runs five scheduled jobs from the registry in
`src/schedules.js`. The runner that reads those expressions and decides when
each job starts is `src/cron.js`, and it has its own test file.

Rita in Finance opened this on Tuesday. No dunning email has gone to an overdue
customer since 21 January. Collections found it, not us. Nobody can tell her
when it stopped or why, and she has asked - reasonably - what else on that list
is not running.

We do have an audit. `test/schedules.test.js` was written in April by a
contractor who has since rolled off, and it is meant to check every entry in the
registry against the `intent` next to it. It has been green every week this
year, including every week the dunning run did not happen. That is the part I
want you to sit with before you write anything: whatever you hand back, I need
to be able to trust it more than I currently trust a green run of that file.

The `intent` text is the requirement. It was written by the team that asked for
each job and it is the only record of what they asked for; the expression beside
it is a claim about that requirement, and I want it treated as a claim rather
than as documentation.

`src/cron.js` is vendored into eleven services out of the platform monorepo and
is frozen until the Q4 change window, so whatever needs correcting has to be
corrected in this repo. We move this service onto the new host on 5 October and
I am not carrying an unverified schedule across.

## Output Specification

1. `test/schedules.test.js` must end up telling the truth about every entry in
   `src/schedules.js`. Replace it, extend it or rewrite it as you see fit.
2. Correct `src/schedules.js` wherever an expression does not do what its
   `intent` says. Every expression you change must be pinned by an assertion on
   a concrete firing instant produced by the runner, not by an assertion that it
   parses.
3. Write `docs/schedule-audit.md`: a section per job saying when it actually
   fires today, whether that matches its `intent`, what you changed, and
   anything the requirement needs that the expression cannot express.
4. Leave `src/cron.js` and `test/cron.test.js` unchanged and passing. `npm test`
   must be green when you are done.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-worker",
  "version": "4.2.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/cron.js ===============
'use strict';

const HORIZON_DAYS = 1500;

const NAMES = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function token(tok) {
  const named = NAMES[tok.toLowerCase()];
  return named === undefined ? Number(tok) : named;
}

function parseField(raw, lo, hi) {
  const restricted = raw !== '*' && !raw.startsWith('*/');
  const values = new Set();
  for (const part of raw.split(',')) {
    const [spec, stepRaw] = part.split('/');
    const step = stepRaw === undefined ? 1 : Number(stepRaw);
    let from;
    let to;
    if (spec === '*') {
      from = lo;
      to = hi;
    } else if (spec.includes('-')) {
      const [a, b] = spec.split('-');
      from = token(a);
      to = token(b);
    } else {
      from = token(spec);
      to = from;
    }
    for (let v = from; v <= to; v += step) values.add(v);
  }
  return { values, restricted };
}

function parseExpr(expr) {
  const f = String(expr).trim().split(/\s+/);
  if (f.length !== 5) throw new Error(`expected 5 fields, got ${f.length}: ${expr}`);
  return {
    minute: parseField(f[0], 0, 59),
    hour: parseField(f[1], 0, 23),
    dom: parseField(f[2], 1, 31),
    month: parseField(f[3], 1, 12),
    dow: parseField(f[4], 0, 7),
  };
}

function dateMatches(d, p) {
  if (!p.month.values.has(d.getUTCMonth() + 1)) return false;
  const domOk = p.dom.values.has(d.getUTCDate());
  const dowOk = p.dow.values.has(d.getUTCDay());
  if (p.dom.restricted && p.dow.restricted) return domOk || dowOk;
  if (p.dom.restricted) return domOk;
  if (p.dow.restricted) return dowOk;
  return true;
}

// The next instant after fromMs on which this expression fires, or null if it
// does not come round again inside the horizon.
function nextRunUtc(expr, fromMs, horizonDays = HORIZON_DAYS) {
  const p = parseExpr(expr);
  const limit = fromMs + horizonDays * 86400000;
  let t = new Date(Math.floor(fromMs / 60000) * 60000 + 60000);
  while (t.getTime() <= limit) {
    if (!dateMatches(t, p)) {
      t = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1));
      continue;
    }
    if (p.hour.values.has(t.getUTCHours()) && p.minute.values.has(t.getUTCMinutes())) return t;
    t = new Date(t.getTime() + 60000);
  }
  return null;
}

module.exports = { parseExpr, nextRunUtc, HORIZON_DAYS };

=============== FILE: src/schedules.js ===============
'use strict';

// intent is the requirement as the requesting team wrote it; expr is what shipped.
module.exports = [
  {
    name: 'invoice-dunning',
    expr: '0 5 * 13 *',
    intent: '05:00 UTC on the 13th of every month',
  },
  {
    name: 'weekly-digest',
    expr: '0 14 * * 7',
    intent: '14:00 UTC every Sunday',
  },
  {
    name: 'ledger-export',
    expr: '0 0 3 * * *',
    intent: '03:00 UTC every night',
  },
  {
    name: 'card-retry',
    expr: '0 7 2,16 * *',
    intent: '07:00 UTC on the 2nd and the 16th of every month',
  },
  {
    name: 'queue-heartbeat',
    expr: '*/10 * * * *',
    intent: 'every 10 minutes, around the clock',
  },
];

=============== FILE: test/cron.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { nextRunUtc } = require('../src/cron');

// Monday 2026-01-05 00:00 UTC
const BASE = Date.UTC(2026, 0, 5, 0, 0);

test('every fifteen minutes', () => {
  assert.equal(nextRunUtc('*/15 * * * *', BASE).toISOString(), '2026-01-05T00:15:00.000Z');
});

test('daily at 03:00', () => {
  assert.equal(nextRunUtc('0 3 * * *', BASE).toISOString(), '2026-01-05T03:00:00.000Z');
});

test('monthly on the first', () => {
  assert.equal(nextRunUtc('0 0 1 * *', BASE).toISOString(), '2026-02-01T00:00:00.000Z');
});

test('weekdays at 09:00', () => {
  assert.equal(nextRunUtc('0 9 * * 1-5', BASE).toISOString(), '2026-01-05T09:00:00.000Z');
});

test('named month', () => {
  assert.equal(nextRunUtc('0 4 1 jul *', BASE).toISOString(), '2026-07-01T04:00:00.000Z');
});

=============== FILE: test/schedules.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { nextRunUtc } = require('../src/cron');
const schedules = require('../src/schedules');

// Monday 2026-01-05 00:00 UTC
const BASE = Date.UTC(2026, 0, 5, 0, 0);

const byName = (n) => schedules.find((s) => s.name === n);

function expectNextRun(name, expectedIso) {
  const entry = byName(name);
  let run;
  try {
    run = nextRunUtc(entry.expr, BASE);
  } catch {
    return; // runner would not take this one; nothing to compare against
  }
  if (!run) return; // nothing due inside the window
  assert.equal(run.toISOString(), expectedIso, name);
}

test('invoice-dunning fires on the 13th', () => {
  expectNextRun('invoice-dunning', '2026-01-13T05:00:00.000Z');
});

test('weekly-digest fires on the Sunday', () => {
  expectNextRun('weekly-digest', '2026-01-11T14:00:00.000Z');
});

test('ledger-export fires overnight', () => {
  expectNextRun('ledger-export', '2026-01-05T03:00:00.000Z');
});

test('card-retry fires on the 16th', () => {
  expectNextRun('card-retry', '2026-01-16T07:00:00.000Z');
});

test('queue-heartbeat fires every ten minutes', () => {
  expectNextRun('queue-heartbeat', '2026-01-05T00:10:00.000Z');
});

=============== FILE: ops/worker-notes.md ===============
# billing-worker on bw-03

- The worker plans every entry in `src/schedules.js` when it boots. An entry it
  cannot plan - the runner rejects it, or it has no upcoming run - is logged once
  at warn and dropped, and the worker carries on with the rest. Boot logs roll at
  seven days and nobody reads them.
- `src/cron.js` is vendored from the platform monorepo into eleven services.
  Frozen until the Q4 change window.
- Host move to bw-07 scheduled 2026-10-05.
- `npm test` has been green on every weekly run since April.
