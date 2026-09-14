# Support SLA cutoff was an hour late for half the customer list; now something else is wrong

## Problem Description

Our support contract promises a first response by 17:00 in the customer's own
local time. `src/cutoff.js` turns "17:00 local on date D for zone Z" into the
UTC instant the escalation job compares against.

For most of the year it was wrong. We used to keep a table of fixed UTC offsets
per zone, so every customer in a region that changes its clocks got escalated an
hour late for half the year, and we took 41 tickets about it. Dan fixed that in
PR #771 - he deleted the table and had the module ask the runtime's own zone
data for the offset instead. It went to staging a fortnight ago, the US and UK
tickets stopped the same day, and he is waiting on a review before it goes to
production.

Since that deploy we have eleven new tickets from our Indian accounts, who had
never once complained about the cutoff before. They say their escalations are
now firing *before* five o'clock their time. Dan's position is that this cannot
be his change - the module no longer contains an offset anywhere, it asks the
zone database, and the zone database is not wrong about India. He thinks
something upstream is stamping the wrong date on those tickets and has asked me
to review the PR on its merits and stop holding it up.

There are three tests in `test/cutoff.test.js` that pass today and must still
pass. The full list of zones we bill in is in `BILLED_ZONES` in the module.

One more thing from the customer success team: the quarterly SLA report goes
out Friday and they have asked for a frozen CSV of every account's cutoff
instant for each day of next year, so the report is reproducible and nobody has
to rerun anything. Tell me whether to give them that.

## Output Specification

1. Leave `src/cutoff.js` correct for every zone in `BILLED_ZONES`.
2. Add tests to `test/cutoff.test.js` asserting exact UTC instants. Cover the
   zones the current module gets wrong, whether or not they have raised a
   ticket.
3. Write `docs/pr-771-review.md`: merge or do not merge, what Dan's change got
   right, what it still gets wrong and for which accounts, and a verdict on the
   frozen CSV.

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

const HOUR_MS = 3600000;
const CUTOFF_LOCAL_HOUR = 17;

const BILLED_ZONES = [
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Pacific/Chatham',
  'Australia/Adelaide',
];

// How many hours `zone` is ahead of UTC at `instant`, per the runtime's zone data.
function offsetHours(zone, instant) {
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
  return Math.round((asIfUtc - instant.getTime()) / HOUR_MS);
}

// The UTC instant at which the first-response SLA expires for `zone` on `localDate`.
function cutoffInstant(localDate, zone) {
  const asIfUtc = Date.parse(localDate + 'T' + String(CUTOFF_LOCAL_HOUR).padStart(2, '0') + ':00:00Z');
  const offset = offsetHours(zone, new Date(asIfUtc));
  return new Date(asIfUtc - offset * HOUR_MS);
}

function isBreached(ticketOpenedLocalDate, zone, firstResponseAt) {
  return Date.parse(firstResponseAt) > cutoffInstant(ticketOpenedLocalDate, zone).getTime();
}

module.exports = { cutoffInstant, isBreached, offsetHours, BILLED_ZONES };

=============== FILE: test/cutoff.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cutoffInstant, isBreached } = require('../src/cutoff.js');

test('New York cutoff in January', () => {
  assert.equal(cutoffInstant('2026-01-15', 'America/New_York').toISOString(), '2026-01-15T22:00:00.000Z');
});

test('London cutoff in June', () => {
  assert.equal(cutoffInstant('2026-06-15', 'Europe/London').toISOString(), '2026-06-15T16:00:00.000Z');
});

test('a response one minute after the cutoff is a breach', () => {
  assert.equal(isBreached('2026-06-15', 'America/New_York', '2026-06-15T21:01:00Z'), true);
  assert.equal(isBreached('2026-06-15', 'America/New_York', '2026-06-15T20:59:00Z'), false);
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
+  const offset = offsetHours(zone, new Date(asIfUtc));
```

with `offsetHours` reading the offset out of the runtime's zone data for the
instant in question instead of out of a literal.

## Ticket summary as at 2026-11-16

| Zone | Accounts | Complaint | First reported |
|---|---|---|---|
| America/New_York | 19 | escalation an hour late | 2026-03-10; stopped 2026-11-02 |
| Europe/London | 9 | escalation an hour late | 2026-04-02; stopped 2026-11-02 |
| Asia/Kolkata | 11 | escalation fires before 5pm our time | 2026-11-03 |
| Asia/Kathmandu | 2 | none | |
| Pacific/Chatham | 3 | none | |
| Australia/Adelaide | 6 | none | |

## Notes from the author

Nineteen New York tickets and nine London ones, every single one of them now
lands on the right instant, including the ones that straddle the March and
October weekends. The offset is no longer written down anywhere in this repo,
which was the whole complaint in the original bug.

The Indian tickets are new since the deploy and I do not accept they are mine.
There is no offset for India in this module any more - it asks the zone
database, the zone database knows India does not change its clocks, and the
before-and-after on those accounts should therefore be identical. My guess is
the ticket importer is stamping a local date from the wrong zone. I have
already asked the platform team to look at it.

Kathmandu, Chatham and Adelaide are small accounts and have not raised
anything, so I have not gone looking there.
