# "Get everything into feature files" - including the retry helper

## Problem Description

We run two kinds of tests in this repo. `features/refunds.feature` describes the
refund policy; our finance lead reads it in every sprint review and has edited it
twice herself when the policy changed. `test/retry.test.js` covers the backoff
maths in `@acme/retry`, an internal package that our own services import - it has
no UI, no customer, and nobody outside the four backend engineers has ever opened
that file.

Two things landed on us this week.

Finance signed off a new rule: orders in the `digital` category are never
refundable, whatever their age. `src/refund-policy.js` already implements it. The
feature file does not mention it.

Separately, our engineering manager saw the refund feature in a review, liked how
readable it was, and asked us to "get everything into feature files so the whole
suite reads the same way", naming `test/retry.test.js` specifically. He has not
worked with these tools before and asked us to come back with the change and a
short note on how it went.

## Output Specification

1. Cover the new digital-order rule so that it lands in the file finance reads.
   Reuse the step vocabulary already in `features/step_definitions/refund.steps.js`
   wherever the sentence exists; add step code only for what is genuinely new.
2. Deliver whatever you conclude is the right end state for `test/retry.test.js`,
   and include, in no more than three sentences, the reason it takes that shape.
   Address the note to the manager - he will read it and act on it.
3. Everything under `src/` is production code and must not change.
4. Whatever you deliver, the backoff behaviour that `test/retry.test.js` covers
   today must still be covered when you are done.

## Input Files

Extract the following files before beginning.

=============== FILE: features/refunds.feature ===============
Feature: Refund policy

  Scenario: Full refund inside thirty days
    Given a delivered order worth $80.00 in the "books" category
    When a refund is requested 10 days later
    Then the refund is approved for $80.00

  Scenario: Half refund in the second month
    Given a delivered order worth $80.00 in the "books" category
    When a refund is requested 45 days later
    Then the refund is approved for $40.00

  Scenario: Nothing after sixty days
    Given a delivered order worth $80.00 in the "books" category
    When a refund is requested 90 days later
    Then the refund is refused because "Outside the refund window"

=============== FILE: features/step_definitions/refund.steps.js ===============
const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { refundFor, DAY } = require('../../src/refund-policy');

Given('a delivered order worth ${float} in the {string} category', function (total, category) {
  this.order = { total, category, deliveredAt: 0 };
});

When('a refund is requested {int} days later', function (days) {
  this.decision = refundFor(this.order, days * DAY);
});

Then('the refund is approved for ${float}', function (amount) {
  assert.strictEqual(this.decision.approved, true);
  assert.strictEqual(this.decision.amount, amount);
});

Then('the refund is refused because {string}', function (reason) {
  assert.strictEqual(this.decision.approved, false);
  assert.strictEqual(this.decision.reason, reason);
});

=============== FILE: src/refund-policy.js ===============
const DAY = 24 * 60 * 60 * 1000;

function refundFor(order, requestedAfter) {
  if (order.category === 'digital') {
    return { approved: false, reason: 'Digital orders are final' };
  }
  if (requestedAfter <= 30 * DAY) {
    return { approved: true, amount: order.total };
  }
  if (requestedAfter <= 60 * DAY) {
    return { approved: true, amount: Number((order.total * 0.5).toFixed(2)) };
  }
  return { approved: false, reason: 'Outside the refund window' };
}

module.exports = { refundFor, DAY };

=============== FILE: src/retry.js ===============
function backoff(attempt, { base = 100, cap = 2000, jitter = 0 } = {}) {
  const raw = Math.min(cap, base * 2 ** (attempt - 1));
  return Math.round(raw * (1 - jitter));
}

module.exports = { backoff };

=============== FILE: test/retry.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const { backoff } = require('../src/retry');

test('doubles the delay on each attempt', () => {
  assert.strictEqual(backoff(1), 100);
  assert.strictEqual(backoff(2), 200);
  assert.strictEqual(backoff(3), 400);
});

test('never exceeds the cap', () => {
  assert.strictEqual(backoff(9), 2000);
});

test('jitter reduces the delay proportionally', () => {
  assert.strictEqual(backoff(2, { jitter: 0.25 }), 150);
});

=============== FILE: cucumber.js ===============
module.exports = {
  default: {
    require: ['features/step_definitions/**/*.js'],
    format: ['progress'],
  },
};

=============== FILE: package.json ===============
{
  "name": "acme-billing",
  "private": true,
  "scripts": {
    "bdd": "cucumber-js",
    "test": "node --test test/"
  },
  "devDependencies": {
    "@cucumber/cucumber": "^10.9.0"
  }
}
