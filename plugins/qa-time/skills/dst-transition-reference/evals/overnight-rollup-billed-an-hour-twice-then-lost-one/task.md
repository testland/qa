# Metered usage: one hour double-billed in March, one hour missing in November

## Problem Description

Finance reconciled the 2026 metered-usage invoices against the raw session log
last week and found two discrepancies on the same handful of accounts.

On the March invoice, four accounts were charged for 3600 seconds of usage that
also appears on the following day's line. On the November invoice, the same
four accounts were charged for 3600 seconds *less* than the raw log shows.
Everyone else on that invoice reconciled to the second. The four accounts are
all on the `America/New_York` plan. Finance only reconciled the US book because
it is the biggest one; the rest of the fleet bills in `Europe/London`,
`Asia/Kolkata`, `America/Havana` and `Australia/Lord_Howe` and nobody has gone
near those numbers.

The rollup worker is `src/usageWindow.js`. It takes a local calendar date plus
the account's zone, works out the window for that day, and sums the session
time that falls inside it. Sessions themselves are stored as UTC instants and
finance confirmed the raw log is correct - the sessions are fine, the window is
not.

Priya from on-call has already written a patch and wants a second opinion
before she opens the PR; it is in `docs/incident-4471.md`. Her patch adjusts the
window length on the second Sunday in March and the first Sunday in November,
and pairs that with a de-duplication key of `accountId + local date + local
hour` in the invoice builder so that the same hour can never be counted twice
again whatever else goes wrong. She reran the March and November invoices with
it and both reconciled.

I am uneasy about shipping it and I cannot articulate why, which is why I am
asking you. Tell me whether to ship it as written, and if not, fix
`src/usageWindow.js` properly. There are five tests in
`test/usageWindow.test.js` that pass today and must still pass.

## Output Specification

1. Fix `src/usageWindow.js` if it needs fixing. Do not change the storage
   format of the sessions.
2. Add tests to `test/usageWindow.test.js` that fail against the current module
   and pass against yours. State the exact expected numbers, and cover every
   zone in `BILLED_ZONES` rather than only the one that was reported.
3. Write `docs/review-4471.md`: a verdict on Priya's patch, covering the window
   change and the de-duplication key separately, and what each of the five
   zones we bill in means for any fix.

`node --test` must be green when you are done.

## Input Files

Extract the following files before beginning, preserving the paths.

=============== FILE: package.json ===============
{
  "name": "usage-rollup",
  "version": "3.4.1",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/usageWindow.js ===============
'use strict';

const HOUR_MS = 3600000;

const BILLED_ZONES = [
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',
  'America/Havana',
  'Australia/Lord_Howe',
];

// Offset of `zone` from UTC at `instant`, in milliseconds.
function zoneOffsetMs(zone, instant) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asIfUtc - instant.getTime();
}

// "2026-06-15T00:00:00" in `zone` -> the UTC instant it names.
function localToInstant(wallClock, zone) {
  const naive = Date.parse(wallClock + 'Z');
  let ts = naive - zoneOffsetMs(zone, new Date(naive));
  ts = naive - zoneOffsetMs(zone, new Date(ts));
  return new Date(ts);
}

function dayWindow(localDate, zone) {
  const start = localToInstant(localDate + 'T00:00:00', zone);
  const end = new Date(start.getTime() + 24 * HOUR_MS);
  return { start, end };
}

function billableSeconds(sessions, localDate, zone) {
  const { start, end } = dayWindow(localDate, zone);
  let total = 0;
  for (const s of sessions) {
    const from = Math.max(Date.parse(s.start), start.getTime());
    const to = Math.min(Date.parse(s.end), end.getTime());
    if (to > from) total += (to - from) / 1000;
  }
  return total;
}

module.exports = { dayWindow, billableSeconds, localToInstant, zoneOffsetMs, BILLED_ZONES };

=============== FILE: test/usageWindow.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { dayWindow, billableSeconds } = require('../src/usageWindow.js');

const windowSeconds = (w) => (w.end.getTime() - w.start.getTime()) / 1000;

test('an ordinary June day in New York is 86400 seconds', () => {
  assert.equal(windowSeconds(dayWindow('2026-06-15', 'America/New_York')), 86400);
});

test('an ordinary June day in Kolkata starts at 18:30 UTC the day before', () => {
  const w = dayWindow('2026-06-15', 'Asia/Kolkata');
  assert.equal(w.start.toISOString(), '2026-06-14T18:30:00.000Z');
});

test('an ordinary June day in Havana starts at 04:00 UTC', () => {
  const w = dayWindow('2026-06-15', 'America/Havana');
  assert.equal(w.start.toISOString(), '2026-06-15T04:00:00.000Z');
  assert.equal(windowSeconds(w), 86400);
});

test('a session covering an ordinary day bills the whole day', () => {
  const sessions = [{ start: '2026-06-15T04:00:00Z', end: '2026-06-16T04:00:00Z' }];
  assert.equal(billableSeconds(sessions, '2026-06-15', 'America/New_York'), 86400);
});

test('a session after the window is not billed', () => {
  const sessions = [{ start: '2026-06-16T05:00:00Z', end: '2026-06-16T06:00:00Z' }];
  assert.equal(billableSeconds(sessions, '2026-06-15', 'America/New_York'), 0);
});

=============== FILE: docs/incident-4471.md ===============
# INC-4471 - metered usage reconciliation breaks twice a year

Reported by: finance (M. Okonjo), 2026-11-14
On-call: P. Raghavan

## What finance found

| Invoice | Accounts | Direction | Amount |
|---|---|---|---|
| March 2026  | 4 (all America/New_York) | over  | 3600s, also present on the next day's line |
| November 2026 | the same 4 | under | 3600s, present in the raw log, on no invoice line |

Windows pulled out of the worker for the affected dates, plus a couple of
others I grabbed while I was in there. Sessions on these accounts are
continuous 24/7:

```
2026-03-08 America/New_York  : 2026-03-08T05:00:00Z -> 2026-03-09T05:00:00Z
2026-03-09 America/New_York  : 2026-03-09T04:00:00Z -> 2026-03-10T04:00:00Z
2026-11-01 America/New_York  : 2026-11-01T04:00:00Z -> 2026-11-02T04:00:00Z
2026-11-02 America/New_York  : 2026-11-02T05:00:00Z -> 2026-11-03T05:00:00Z
2026-03-07 America/Havana    : 2026-03-07T05:00:00Z -> 2026-03-08T05:00:00Z
2026-03-08 America/Havana    : 2026-03-08T04:00:00Z -> 2026-03-09T04:00:00Z
2026-06-15 Australia/Lord_Howe : 2026-06-14T13:30:00Z -> 2026-06-15T13:30:00Z
```

Only the US accounts have been reconciled. We have not looked at whether the
rest of the book is clean or whether nobody has checked.

## Proposed patch (P. Raghavan, not yet a PR)

```diff
 function dayWindow(localDate, zone) {
   const start = localToInstant(localDate + 'T00:00:00', zone);
-  const end = new Date(start.getTime() + 24 * HOUR_MS);
+  let hours = 24;
+  if (localDate === '2026-03-08') hours = 23;
+  if (localDate === '2026-11-01') hours = 25;
+  const end = new Date(start.getTime() + hours * HOUR_MS);
   return { start, end };
 }
```

plus, in the invoice builder (`src/invoice.js`, not shown):

```diff
-  const key = accountId + '|' + session.id;
+  // belt and braces: one account can never be billed the same local hour twice
+  const key = accountId + '|' + localDateOf(session) + '|' + localHourOf(session);
```

Reran both invoices with this applied. March reconciled. November reconciled.
Suggest we ship before the next billing run on the 20th.
