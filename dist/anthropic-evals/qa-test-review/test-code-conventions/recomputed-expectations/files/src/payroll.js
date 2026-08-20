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
