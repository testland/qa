# Payroll tests stayed green through a rate change

## Problem Description

A refactor of `src/payroll.js` changed the overtime multiplier from 1.5 to 2
and nothing failed. The same thing happened earlier with the withholding rate:
the suite went green on the wrong numbers and the error reached two pay runs
before anyone noticed.

`src/payroll.js` is correct as it stands today. The tests are not wrong about
which behaviours to cover - they cover the right three - they simply never
disagree with whatever the module happens to be doing.

Payroll amounts are also signed off by people who do not read JavaScript. When
a test fails, they need to be able to see what amount was expected without
running anything or opening the source module.

## Output Specification

1. Rewrite `src/payroll.test.js` so that changing any rate or any formula in
   `src/payroll.js` makes at least one test fail. Keep the same three
   scenarios and the same inputs (20.00 per hour, 45 hours worked, and the
   1000.00 gross used by the withholding test).
2. A reviewer who does not run the suite must be able to read each expected
   amount and see where that amount came from.
3. Produce `expectation-review.md` naming, for each test, what the previous
   version would have accepted and what the new one pins down.

Do not change `src/payroll.js`.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "payroll",
  "version": "1.4.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/payroll.js ===============
'use strict';

const STANDARD_WEEK_HOURS = 40;
const OVERTIME_MULTIPLIER = 1.5;
const WITHHOLDING_RATE = 0.22;

function grossPay(hourlyCents, hoursWorked) {
  const baseCents = Math.min(hoursWorked, STANDARD_WEEK_HOURS) * hourlyCents;
  const overtimeHours = Math.max(0, hoursWorked - STANDARD_WEEK_HOURS);
  const overtimeCents = Math.round(overtimeHours * hourlyCents * OVERTIME_MULTIPLIER);
  return baseCents + overtimeCents;
}

function withholding(grossCents) {
  return Math.round(grossCents * WITHHOLDING_RATE);
}

function netPay(hourlyCents, hoursWorked) {
  const gross = grossPay(hourlyCents, hoursWorked);
  return gross - withholding(gross);
}

module.exports = {
  grossPay,
  withholding,
  netPay,
  STANDARD_WEEK_HOURS,
  OVERTIME_MULTIPLIER,
  WITHHOLDING_RATE,
};

=============== FILE: src/payroll.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  grossPay,
  withholding,
  netPay,
  STANDARD_WEEK_HOURS,
  OVERTIME_MULTIPLIER,
  WITHHOLDING_RATE,
} = require('./payroll');

const HOURLY_CENTS = 2000;
const HOURS_WORKED = 45;

test('grossPay pays overtime above the standard week', () => {
  const expected =
    STANDARD_WEEK_HOURS * HOURLY_CENTS +
    Math.round((HOURS_WORKED - STANDARD_WEEK_HOURS) * HOURLY_CENTS * OVERTIME_MULTIPLIER);

  assert.equal(grossPay(HOURLY_CENTS, HOURS_WORKED), expected);
});

test('withholding takes the configured rate off the gross', () => {
  const grossCents = 100000;

  assert.equal(withholding(grossCents), Math.round(grossCents * WITHHOLDING_RATE));
});

test('netPay is the gross less the withholding', () => {
  const expected =
    grossPay(HOURLY_CENTS, HOURS_WORKED) - withholding(grossPay(HOURLY_CENTS, HOURS_WORKED));

  assert.equal(netPay(HOURLY_CENTS, HOURS_WORKED), expected);
});
