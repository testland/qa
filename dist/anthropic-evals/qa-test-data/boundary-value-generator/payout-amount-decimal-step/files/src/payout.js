'use strict';

// Amounts are decimal euros. Accepted range is 5.00 to 10000.00 euros, both
// endpoints included. An amount may carry at most 2 decimal places; a finer
// amount is rejected before the range is examined.
const MIN_CENTS = 500; // 5.00 EUR
const MAX_CENTS = 1000000; // 10000.00 EUR
const SCALE_TOLERANCE = 1e-6; // absorbs binary float drift, not a real half-cent

function toCents(amountEur) {
  const scaled = amountEur * 100;
  const cents = Math.round(scaled);
  if (Math.abs(scaled - cents) > SCALE_TOLERANCE) {
    return null;
  }
  return cents;
}

function validatePayout(amountEur) {
  if (typeof amountEur !== 'number' || !Number.isFinite(amountEur)) {
    return { ok: false, code: 'NOT_A_NUMBER', cents: null };
  }
  const cents = toCents(amountEur);
  if (cents === null) {
    return { ok: false, code: 'SUB_CENT_PRECISION', cents: null };
  }
  if (cents < MIN_CENTS) {
    return { ok: false, code: 'BELOW_MIN', cents };
  }
  if (cents > MAX_CENTS) {
    return { ok: false, code: 'ABOVE_MAX', cents };
  }
  return { ok: true, code: null, cents };
}

module.exports = { validatePayout, toCents, MIN_CENTS, MAX_CENTS };
