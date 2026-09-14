# Night crew released an hour early in New York and an hour late in London

## Problem Description

The warehouse roster generator (`src/shiftPlan.js`) builds night shifts for
four sites. Every site runs the same shift: crew on at 22:30 local, handover to
the day crew at 06:30 local. It has produced four incidents this year and the
operations manager has stopped trusting it.

On the night of 31 October the New York night crew clocked off at 05:30 local
and went home. The day crew turned up at 06:30 as always and the floor had been
empty for an hour, which is how we found out. On the night of 28 March the
London crew were held until 07:30 local, an hour after the day crew had already
started, and we paid an hour of overlap on both ends of the floor. Our Lord
Howe Island site has had the same thing twice, on the nights of 3 October and 4
April, except that there it was half an hour each way rather than an hour, and
the site manager has been told twice that this is impossible.

Our Bangalore site has never had any of this happen.

The ops lead has a patch in `docs/roster-incidents.md` and he is pushing it
hard, because this fix has already slipped twice and the next roster goes out
on Monday. He has an alternative in there too if we would rather not touch the
end of the shift at all.

`test/shiftPlan.test.js` has five tests that pass today and must keep passing.
I want this fixed properly rather than nudged, and I want to be able to tell
the ops lead precisely what each of his two options would produce on each of
the four incident nights.

## Output Specification

1. Fix `src/shiftPlan.js`. Every column the downstream systems read off a
   generated shift has to be right at every site, on every night of the year -
   not only on the nights nobody has complained about yet.
2. Add tests covering the four incident nights, asserting exact UTC instants.
3. Write `docs/roster-fix.md`: the rule the generator now follows, a verdict on
   the ops lead's patch and on the alternative he floats, and exactly what each
   of the two would produce on each of the four incident nights.

`node --test` must be green when you are done.

## Input Files

Extract the following files before beginning, preserving the paths.

=============== FILE: package.json ===============
{
  "name": "warehouse-roster",
  "version": "1.9.3",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/zoneTime.js ===============
'use strict';

function parts(zone, instant) {
  const list = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  return Object.fromEntries(list.map((x) => [x.type, x.value]));
}

// Offset of `zone` from UTC at `instant`, in milliseconds.
function zoneOffsetMs(zone, instant) {
  const p = parts(zone, instant);
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asIfUtc - instant.getTime();
}

// The local wall clock in zone at instant, as YYYY-MM-DDTHH:mm:ss.
function localLabel(instant, zone) {
  const p = parts(zone, instant);
  const hh = String(+p.hour % 24).padStart(2, '0');
  return p.year + '-' + p.month + '-' + p.day + 'T' + hh + ':' + p.minute + ':' + p.second;
}

// A local wall clock reading in zone -> the UTC instant it names.
function localToInstant(wallClock, zone) {
  const naive = Date.parse(wallClock + 'Z');
  let ts = naive - zoneOffsetMs(zone, new Date(naive));
  ts = naive - zoneOffsetMs(zone, new Date(ts));
  return new Date(ts);
}

module.exports = { zoneOffsetMs, localLabel, localToInstant };

=============== FILE: src/shiftPlan.js ===============
'use strict';

const { localToInstant } = require('./zoneTime.js');

const SHIFT_HOURS = 8;

const SITES = {
  'nyc-1': { zone: 'America/New_York', nightStart: '22:30', handover: '06:30' },
  'ldn-2': { zone: 'Europe/London', nightStart: '22:30', handover: '06:30' },
  'lhi-4': { zone: 'Australia/Lord_Howe', nightStart: '22:30', handover: '06:30' },
  'blr-3': { zone: 'Asia/Kolkata', nightStart: '22:30', handover: '06:30' },
};

function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// One night shift per calendar day, starting at the site's fixed local time.
function nightShifts(siteId, fromDate, days) {
  const site = SITES[siteId];
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i);
    const startLocal = date + 'T' + site.nightStart + ':00';
    const startsAt = localToInstant(startLocal, site.zone);
    out.push({
      siteId,
      zone: site.zone,
      startLocal,
      startsAt,
      endsAt: new Date(startsAt.getTime() + SHIFT_HOURS * 3600000),
      paidHours: SHIFT_HOURS,
    });
  }
  return out;
}

module.exports = { nightShifts, addDays, SITES, SHIFT_HOURS };

=============== FILE: test/shiftPlan.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { nightShifts, addDays } = require('../src/shiftPlan.js');
const { localLabel } = require('../src/zoneTime.js');

test('one shift per day is generated', () => {
  assert.equal(nightShifts('nyc-1', '2026-06-15', 7).length, 7);
});

test('addDays walks calendar dates', () => {
  assert.equal(addDays('2026-06-28', 5), '2026-07-03');
});

test('an ordinary June night in New York runs 02:30Z to 10:30Z', () => {
  const [shift] = nightShifts('nyc-1', '2026-06-15', 1);
  assert.equal(shift.startsAt.toISOString(), '2026-06-16T02:30:00.000Z');
  assert.equal(shift.endsAt.toISOString(), '2026-06-16T10:30:00.000Z');
});

test('an ordinary June night in London hands over at 06:30 local', () => {
  const [shift] = nightShifts('ldn-2', '2026-06-15', 1);
  assert.equal(shift.startsAt.toISOString(), '2026-06-15T21:30:00.000Z');
  assert.equal(localLabel(shift.endsAt, shift.zone), '2026-06-16T06:30:00');
});

test('an ordinary June night in Bangalore is eight paid hours', () => {
  const [shift] = nightShifts('blr-3', '2026-06-15', 1);
  assert.equal(shift.startsAt.toISOString(), '2026-06-15T17:00:00.000Z');
  assert.equal(shift.endsAt.toISOString(), '2026-06-16T01:00:00.000Z');
  assert.equal(shift.paidHours, 8);
});

=============== FILE: docs/roster-incidents.md ===============
# Roster generator - four incidents, one proposed patch

Raised by: T. Abara (operations)

## Incidents

| Night of | Site | What happened |
|---|---|---|
| 2026-10-31 | nyc-1 | crew released 05:30 local; day crew due 06:30; one hour uncovered |
| 2026-03-28 | ldn-2 | crew held to 07:30 local; day crew already on the floor for an hour |
| 2026-10-03 | lhi-4 | crew held 30 minutes past the handover |
| 2026-04-04 | lhi-4 | crew released 30 minutes before the handover |
| never | blr-3 | nothing, ever |

Raw generator output pulled for the incident nights:

```
nightShifts('nyc-1','2026-10-31',1) -> startsAt 2026-11-01T02:30:00.000Z  endsAt 2026-11-01T10:30:00.000Z  paidHours 8
nightShifts('ldn-2','2026-03-28',1) -> startsAt 2026-03-28T22:30:00.000Z  endsAt 2026-03-29T06:30:00.000Z  paidHours 8
nightShifts('lhi-4','2026-10-03',1) -> startsAt 2026-10-03T12:00:00.000Z  endsAt 2026-10-03T20:00:00.000Z  paidHours 8
nightShifts('lhi-4','2026-04-04',1) -> startsAt 2026-04-04T11:30:00.000Z  endsAt 2026-04-04T19:30:00.000Z  paidHours 8
nightShifts('blr-3','2026-06-15',1) -> startsAt 2026-06-15T17:00:00.000Z  endsAt 2026-06-16T01:00:00.000Z  paidHours 8
```

## Proposed patch

Anchor the end of the shift to the site's handover time, the same way the start
is anchored to the site's start time:

```diff
-      endsAt: new Date(startsAt.getTime() + SHIFT_HOURS * 3600000),
+      endsAt: localToInstant(addDays(date, 1) + 'T' + site.handover + ':00', site.zone),
       paidHours: SHIFT_HOURS,
```

Two lines. I have run it over the four incident nights and every one of them
comes out with the crew released at 06:30 local, which is the whole complaint.
`paidHours` I have left alone deliberately - eight hours is what a night shift
is, it is in the agreement, and if that column starts varying then payroll have
to re-cut every export they have ever produced.

## Alternative if you would rather not touch the end of the shift

We know which nights these are. Add an hour to `endsAt` on the night the clocks
go back and take an hour off on the night they go forward, keyed on the date.
Four dates a year, one line, and nothing else in the file moves.

## Appendix - note from payroll (S. Whitcombe)

For the avoidance of doubt, the export takes the `paidHours` column off the
generated shift verbatim and pays on it. Under clause 14.3 of the enterprise
agreement night crews are paid for time on the floor between the two handovers,
so whatever ends up in that column is what we are asserting they worked.
