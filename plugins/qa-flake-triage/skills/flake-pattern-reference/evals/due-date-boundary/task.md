# Due-date tests fail at night here and all day in the Tokyo office

## Problem Description

`test/dueDate.test.js` is green in CI and green for most of us most of the
time. Two things break it:

- Our nightly 23:45 pipeline run fails `an invoice due in thirty minutes is
  flagged due today` with `expected 'Upcoming' to equal 'Due today'`. The
  09:00 run of the same commit is green.
- A colleague who joined the Tokyo office fails `an invoice due later today
  is flagged due today` on every run, all day, on a clean checkout.

Nobody else can reproduce the Tokyo failure, and nobody in Tokyo can
reproduce the green run. Re-running the nightly job at 23:55 usually fails
too; re-running it at 00:30 passes.

`src/dueDate.js` is behaving as specified: invoices are due on the
customer's local calendar day, and product has confirmed that is what they
want. The bug report is about the tests, not the rule.

## Output Specification

1. Fix `test/dueDate.test.js` so all three tests pass on any machine at any
   time of day. A reviewer will run the file with the machine configured for
   Tokyo, for Los Angeles, and for UTC, and at 23:50 local as well as at
   midday.
2. Keep all three tests and the behaviour each one describes. Do not modify
   `src/dueDate.js`.
3. Write `date-handling-notes.md`: what varies between a passing run and a
   failing one, why one test fails only in a narrow window and the other
   fails constantly for one colleague, and the rule for writing the next test
   in this file.

Run `node --test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-web",
  "version": "4.6.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/dueDate.js ===============
'use strict';

// Invoices are due on the customer's local calendar day.
function isDueToday(dueAtIso, now = new Date()) {
  const due = new Date(dueAtIso);
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function dueLabel(dueAtIso, now = new Date()) {
  if (isDueToday(dueAtIso, now)) {
    return 'Due today';
  }
  return new Date(dueAtIso) < now ? 'Overdue' : 'Upcoming';
}

module.exports = { isDueToday, dueLabel };

=============== FILE: test/dueDate.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isDueToday, dueLabel } = require('../src/dueDate');

const today = new Date().toISOString().slice(0, 10);

test('an invoice due later today is flagged due today', () => {
  assert.equal(isDueToday(`${today}T23:30:00Z`), true);
});

test('an invoice due in thirty minutes is flagged due today', () => {
  const dueAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  assert.equal(dueLabel(dueAt), 'Due today');
});

test('an invoice from last week is overdue', () => {
  const dueAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  assert.equal(dueLabel(dueAt), 'Overdue');
});
