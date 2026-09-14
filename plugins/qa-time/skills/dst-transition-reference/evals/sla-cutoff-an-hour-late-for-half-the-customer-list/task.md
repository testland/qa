# Review PR #771 before it goes to production - SLA cutoff rewrite

## Problem Description

Our support contract promises a first response by 17:00 in the customer's own
local time. `src/cutoff.js` turns "17:00 local on date D for zone Z" into the UTC
instant the escalation job compares against.

For most of last year it was wrong. We kept a table of fixed UTC offsets per
zone, so every customer in a region that changes its clocks got escalated an
hour late for half the year, and we took 41 tickets about it. Dan rewrote it in
PR #771 - the table is gone and the module asks the runtime's own zone data
instead. It went to staging on 2 November, the US and UK tickets stopped the
same day, and it has been sitting there waiting on a review ever since. The
write-up is in `docs/pr-771.md`.

I am the reviewer and I have been putting it off, because this is not an area of
the code I trust myself on and Dan is a good deal more confident about it than I
am. He would like it signed off this week. I would rather someone went through
it properly than rubber-stamped it, and if it is going out then I want to know
what we are shipping rather than what we intended to ship.

There are four tests in `test/cutoff.test.js` that pass today and must still
pass. The full list of zones we bill in is in `BILLED_ZONES` in the module.

## Output Specification

1. Leave `src/cutoff.js` correct for every zone in `BILLED_ZONES`.
2. Add tests to `test/cutoff.test.js` asserting exact UTC instants.
3. Write `docs/pr-771-review.md`: merge or do not merge, what the change got
   right, what it still gets wrong and for which accounts, and an answer to the
   request at the bottom of `docs/pr-771.md`.

`node --test` must be green when you are done.

## Input Files

Extract the following files before beginning, preserving the paths.

=============== FILE: package.json ===============
{
  "name": "sla-escalation",
  "version": "2.1.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/cutoff.js ===============
'use strict';

const CUTOFF_LOCAL_HOUR = 17;

const BILLED_ZONES = [
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Pacific/Chatham',
  'Australia/Adelaide',
];

// Resolving a zone through Intl showed up in the worker profile, so the answer
// for a zone is kept once it has been worked out.
const offsetCache = new Map();

// Offset of `zone` from UTC at `instant`, in milliseconds, per the runtime's zone data.
function zoneOffsetMs(zone, instant) {
  if (offsetCache.has(zone)) return offsetCache.get(zone);
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
  const ms = asIfUtc - instant.getTime();
  offsetCache.set(zone, ms);
  return ms;
}

// The UTC instant at which the first-response SLA expires for `zone` on `localDate`.
function cutoffInstant(localDate, zone) {
  const hh = String(CUTOFF_LOCAL_HOUR).padStart(2, '0');
  const asIfUtc = Date.parse(localDate + 'T' + hh + ':00:00Z');
  return new Date(asIfUtc - zoneOffsetMs(zone, new Date(asIfUtc)));
}

function isBreached(ticketOpenedLocalDate, zone, firstResponseAt) {
  return Date.parse(firstResponseAt) > cutoffInstant(ticketOpenedLocalDate, zone).getTime();
}

module.exports = { cutoffInstant, isBreached, zoneOffsetMs, BILLED_ZONES };

=============== FILE: test/cutoff.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cutoffInstant, isBreached } = require('../src/cutoff.js');

test('New York cutoff in January', () => {
  assert.equal(cutoffInstant('2026-01-15', 'America/New_York').toISOString(), '2026-01-15T22:00:00.000Z');
});

test('London cutoff in January', () => {
  assert.equal(cutoffInstant('2026-01-15', 'Europe/London').toISOString(), '2026-01-15T17:00:00.000Z');
});

test('Kolkata cutoff in June', () => {
  assert.equal(cutoffInstant('2026-06-15', 'Asia/Kolkata').toISOString(), '2026-06-15T11:30:00.000Z');
});

test('a response one minute after the cutoff is a breach', () => {
  assert.equal(isBreached('2026-01-20', 'America/New_York', '2026-01-20T22:01:00Z'), true);
  assert.equal(isBreached('2026-01-20', 'America/New_York', '2026-01-20T21:59:00Z'), false);
});

=============== FILE: docs/pr-771.md ===============
# PR #771 - stop hardcoding UTC offsets in the SLA cutoff

Author: D. Whitfield
Status: on staging since 2026-11-02, awaiting review before production

## What it did

```diff
-const UTC_OFFSET_HOURS = {
-  'America/New_York': -5,
-  'Europe/London': 0,
-  'Asia/Kolkata': 5.5,
-  'Asia/Kathmandu': 5.75,
-  'Pacific/Chatham': 12.75,
-  'Australia/Adelaide': 9.5,
-};
-
 function cutoffInstant(localDate, zone) {
-  const offset = UTC_OFFSET_HOURS[zone];
+  return new Date(asIfUtc - zoneOffsetMs(zone, new Date(asIfUtc)));
```

with `zoneOffsetMs` reading the offset out of the runtime's zone data instead of
out of a literal.

## Ticket summary as at 2026-11-16

| Zone | Accounts | Complaint | First reported |
|---|---|---|---|
| America/New_York | 19 | escalation an hour late | 2026-03-10; stopped 2026-11-02 |
| Europe/London | 9 | escalation an hour late | 2026-04-02; stopped 2026-11-02 |
| Asia/Kolkata | 11 | none | |
| Asia/Kathmandu | 2 | none | |
| Pacific/Chatham | 3 | none | |
| Australia/Adelaide | 6 | none | |

## Notes from the author

- Nineteen New York tickets and nine London ones, and every one of them stopped
  the day this went to staging. The offset is not written down anywhere in this
  repo any more, which was the whole complaint in the original bug.
- The escalation worker is a long-lived process. It is restarted on deploy and
  otherwise runs for months at a time; the last restart was this deploy, on
  2026-11-02.
- I profiled it before and after. Going through `Intl` on every ticket was
  showing up at around 8% of the worker's CPU at peak, so the answer for a zone
  is worked out once and kept. Same numbers out, a lot less work.
- Kathmandu, Chatham and Adelaide are small accounts and have never raised
  anything, so I have not gone looking there.

## Ask from customer success (R. Nweke), added to the thread 2026-11-16

The quarterly SLA report goes out on Friday and the auditors want it
reproducible. Can we generate a CSV now holding every account's cutoff instant
for each day of 2027 and attach it to the report, so nobody has to rerun
anything and the numbers can never move on us afterwards?
