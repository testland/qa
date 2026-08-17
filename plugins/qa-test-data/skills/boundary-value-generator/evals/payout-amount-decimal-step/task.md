# Payout amounts are only tested in the middle of the range

## Problem Description

`src/payout.js` validates the amount on an outbound payout. Amounts arrive as
decimal euros and the module converts them to whole cents before comparing
against the accepted range.

Two finance tickets this month. A supplier payout barely above our floor came
back rejected, and a second one barely past our ceiling was paid out anyway.
Both sat within a hair of a limit and neither situation has a test.

There is a separate rule about how precise an amount may be, and finance
suspects it interacts with the range check - an amount just under the floor is
currently refused for a reason nobody expected. Nothing pins that down either.

The existing test covers one ordinary amount.

## Output Specification

1. Add `src/payout.test.js` giving this validator systematic edge coverage
   around every limit it enforces.
2. Cover the precision rule too, including at least one amount that is both
   too precise and outside the range, so the suite records which rule wins.
3. Every rejecting case asserts the specific code, not merely that the call
   failed.
4. Run `npm test` before you finish; it must pass.
5. Do not edit `src/payout.js`, and leave `src/payout.smoke.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "payouts-service",
  "version": "3.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/payout.js ===============
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

=============== FILE: src/payout.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePayout } = require('./payout');

test('accepts an ordinary payout amount', () => {
  assert.deepEqual(validatePayout(25.5), { ok: true, code: null, cents: 2550 });
});
