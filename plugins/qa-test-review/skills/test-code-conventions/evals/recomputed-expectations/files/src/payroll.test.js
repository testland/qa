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
