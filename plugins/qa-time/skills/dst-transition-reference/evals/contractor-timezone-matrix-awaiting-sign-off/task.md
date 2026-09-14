# Contractor's clock-change coverage matrix needs signing off before we pay

## Problem Description

We brought in a contractor for six weeks to give our scheduling service some
coverage for the twice-yearly clock changes, because we have had two incidents
in eighteen months and nobody in the team owns this area. The work has been
delivered: a coverage plan in `docs/tz-coverage-plan.md` and a test file,
`test/transitions.test.js`, that is meant to implement it row for row.

I am the one signing the invoice and I have no way of judging it. The suite is
green - every case passes on my machine, first run, no flakes - and the
contractor's covering note says that is the whole point: every row in the
matrix is backed by a passing assertion, so the matrix is proven.

That is the bit I am stuck on. A green suite is what I would expect to see
whether the plan is right or wrong, and I am about to pay four figures for it.
Two of the rows I have private doubts about because they look like they
contradict each other, and the last row is for a region we do not use yet and
has next year's dates written into it already.

I would rather you formed your own view than chased mine. Go through the matrix
row by row and tell me what I am paying for. Where a row is wrong I need the
correction and enough of a reason that I can put it in front of the contractor.
Where a row cannot be settled from what has been delivered, say so rather than
picking an answer. Do not take my word for any of it either - I am not the
expert here, the fixture is sitting right there, and I would like the answers
grounded in something I can re-run.

## Output Specification

1. Write `docs/plan-review.md` with one verdict per row of the matrix -
   correct, wrong, or not settleable from what was delivered - plus the
   correction where there is one, and an overall recommendation on whether to
   accept the delivery.
2. Leave `test/transitions.test.js` in a state we can keep: correct or remove
   the cases that are wrong, and make each case that stays actually demonstrate
   the thing its name claims.
3. Give a recommendation on the maintenance instruction at the end of the plan.

`node --test` must be green when you are done.

## Input Files

Extract the following files before beginning, preserving the paths.

=============== FILE: package.json ===============
{
  "name": "scheduling-tz-coverage",
  "version": "0.4.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/zone.js ===============
'use strict';

// Offset of `zone` from UTC at `instant`, in whole minutes.
function offsetMinutes(zone, instant) {
  const at = new Date(instant);
  const list = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const p = Object.fromEntries(list.map((x) => [x.type, x.value]));
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return (asIfUtc - at.getTime()) / 60000;
}

module.exports = { offsetMinutes };

=============== FILE: test/transitions.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { offsetMinutes } = require('../src/zone.js');

test('row 1 - New York observes the change', () => {
  assert.equal(offsetMinutes('America/New_York', '2026-06-15T12:00:00Z'), -240);
});

test('row 2 - London observes the change on the same dates as New York', () => {
  assert.equal(offsetMinutes('Europe/London', '2026-06-15T12:00:00Z'), 60);
});

test('row 3 - Sydney is on summer time in January', () => {
  assert.equal(offsetMinutes('Australia/Sydney', '2026-01-15T12:00:00Z'), 660);
});

test('row 4a - Cairo in January', () => {
  assert.equal(offsetMinutes('Africa/Cairo', '2026-01-15T12:00:00Z'), 120);
});

test('row 4b - Cairo ten months later is unchanged, so Egypt has no clock change', () => {
  assert.equal(offsetMinutes('Africa/Cairo', '2026-11-15T12:00:00Z'), 120);
});

test('row 5 - Lord Howe Island observes the same one-hour change as the mainland', () => {
  assert.equal(offsetMinutes('Australia/Lord_Howe', '2026-06-15T12:00:00Z'), 630);
});

test('row 6a - Ciudad Juarez is on summer time in July', () => {
  assert.equal(offsetMinutes('America/Ciudad_Juarez', '2026-07-15T12:00:00Z'), -360);
});

test('row 6b - Ciudad Juarez is on winter time in January', () => {
  assert.equal(offsetMinutes('America/Ciudad_Juarez', '2026-01-15T12:00:00Z'), -420);
});

test('row 6c - Mexico City is the same in July', () => {
  assert.equal(offsetMinutes('America/Mexico_City', '2026-07-15T12:00:00Z'), -360);
});

test('row 6d - Mexico City is the same in January', () => {
  assert.equal(offsetMinutes('America/Mexico_City', '2026-01-15T12:00:00Z'), -360);
});

test('row 7a - Kolkata in January', () => {
  assert.equal(offsetMinutes('Asia/Kolkata', '2026-01-15T12:00:00Z'), 330);
});

test('row 7b - Kolkata in July is identical, so India has no clock change', () => {
  assert.equal(offsetMinutes('Asia/Kolkata', '2026-07-15T12:00:00Z'), 330);
});

test('row 8 - Casablanca is on winter time in January', () => {
  assert.equal(offsetMinutes('Africa/Casablanca', '2026-01-15T12:00:00Z'), 60);
});

=============== FILE: docs/tz-coverage-plan.md ===============
# Clock-change coverage matrix

Prepared by: J. Vance (contract), delivered 2026-11-30
Scope: every zone in which we have scheduled work running, plus one we are
about to onboard

## Covering note

Every row below is backed by at least one passing assertion in
`test/transitions.test.js`. The suite is green end to end. Where a row claims a
region has no clock change I have proved it by asserting the offset twice,
months apart, and showing the two readings agree.

## The matrix

| Row | Zone | Clocks go forward | Clocks go back | Size of the change | Test |
|---|---|---|---|---|---|
| 1 | America/New_York | 2026-03-08 | 2026-11-01 | 1 hour | row 1 |
| 2 | Europe/London | 2026-03-08 | 2026-11-01 | 1 hour | row 2 |
| 3 | Australia/Sydney | 2026-04-05 | 2026-10-04 | 1 hour | row 3 |
| 4 | Africa/Cairo | never - Egypt gave up its clock change years ago | never | n/a | rows 4a, 4b |
| 5 | Australia/Lord_Howe | 2026-10-04 | 2026-04-05 | 1 hour | row 5 |
| 6 | America/Ciudad_Juarez follows the US changes; America/Mexico_City does not change at all | 2026-03-08 | 2026-11-01 | 1 hour | rows 6a-6d |
| 7 | Asia/Kolkata | never | never | n/a | rows 7a, 7b |
| 8 | Africa/Casablanca | 2027-03-28 | 2027-10-31 | 1 hour | row 8 |

## Method

Each row is covered by asserting the zone's offset from UTC at midday on a day
that sits on the summer-time side of the change, which is the side our
scheduled work is most exposed on. Rows for regions with no clock change get
two assertions months apart to demonstrate the offset never moves. Row 6 gets
four cases because it is the only row where two zones in the same country
behave differently.

## Notes

- **Rows 2 and 6.** Europe/London and America/New_York are both on the
  standard northern pattern, so London gets the same dates, which is what our
  own service already assumes.
- **Row 3.** Australia is on the opposite half of the year, so the change
  forward falls in April.
- **Row 4.** Egypt dropped its clock change and I have evidenced that with two
  readings ten months apart that come back identical.
- **Row 5.** Lord Howe Island is administratively part of New South Wales, so
  it changes on the state dates. Same one hour as everywhere else.
- **Row 8.** Casablanca is not live yet - we onboard that region in the new
  year. I have put next year's dates in now so the fixture is ready, using the
  standard European pattern, and asserted the winter offset so the row is not
  empty.

## Maintenance

The dates in this matrix are stable and can be written directly into the
fixtures as literals. They should be reviewed again in 2028.
