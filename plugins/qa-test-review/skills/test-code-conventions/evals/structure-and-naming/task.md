# Subscription tests are unreadable in the CI log

## Problem Description

When `src/subscription.test.js` fails, the CI output says `works` and nothing
else. Whoever is on call opens the file, finds five assertions across three
different functions in one test, and has to bisect by commenting lines out.

Coverage is adequate. Readability and failure attribution are not.

## Output Specification

1. Restructure `src/subscription.test.js` so a failure names what broke
   without anyone opening the file. Every assertion that exists today must
   still exist - this is a restructuring, not a trim.
2. Produce `test-structure-review.md` explaining what was wrong and the
   naming pattern you applied.

Do not change `src/subscription.js`.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-plans",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/subscription.js ===============
'use strict';

const PLANS = {
  team: { name: 'Team', perSeatCents: 1000, seatCap: 25 },
  enterprise: { name: 'Enterprise', perSeatCents: 2500, seatCap: 500 },
};

function planPrice(plan, seats) {
  const definition = PLANS[plan];
  if (!definition) {
    throw new Error(`Unknown plan: ${plan}`);
  }
  if (seats > definition.seatCap) {
    throw new Error(`Seat cap exceeded for ${plan}`);
  }
  return definition.perSeatCents * seats;
}

function prorate(amountCents, daysRemaining, daysInPeriod) {
  if (daysRemaining <= 0) {
    return 0;
  }
  return Math.round((amountCents * daysRemaining) / daysInPeriod);
}

function describePlan(plan) {
  const definition = PLANS[plan];
  if (!definition) {
    throw new Error(`Unknown plan: ${plan}`);
  }
  return { name: definition.name, seatCap: definition.seatCap };
}

module.exports = { planPrice, prorate, describePlan };

=============== FILE: src/subscription.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planPrice, prorate, describePlan } = require('./subscription');

test('works', () => {
  assert.equal(planPrice('team', 5), 5000);
  assert.equal(planPrice('enterprise', 5), 12500);
  const prorated = prorate(5000, 15, 30);
  assert.equal(prorated, 2500);
  assert.equal(describePlan('team').name, 'Team');
  assert.equal(describePlan('team').seatCap, 25);
});

test('test2', () => {
  assert.equal(prorate(1000, 0, 30), 0);
  assert.throws(() => planPrice('startup', 5));
});
