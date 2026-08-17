# A billing-only change broke the checkout scenarios

## Problem Description

Two of us work in this repo. Checkout lives under `features/checkout/` with its
step code in `features/checkout/steps/`, billing lives under `features/billing/`
with its step code in `features/billing/steps/`. We set it up that way so the two
of us could work without stepping on each other.

Yesterday billing added a step for the reference field on an invoice. Nothing
under `features/checkout/` was touched in that commit. The checkout scenarios
stopped running anyway - see `run-output.txt`. Billing's two scenarios pass;
checkout's two do not even get as far as failing.

We do not understand how a file under `features/billing/steps/` can have any
effect on a scenario in `features/checkout/`. Before we start moving directories
around we would like to know what is actually going on.

## Output Specification

1. Make the whole suite run again. All four scenarios must execute and pass.
2. The sentences in both feature files stay exactly as they are written today -
   support signed off on that wording.
3. Explain, in no more than three sentences, why a change under
   `features/billing/` affected scenarios under `features/checkout/`. Write it
   for the two engineers above, who currently believe the directories keep the
   two sets of step code apart.
4. A single run must still cover both areas.
5. State the convention you are adopting to stop the same thing happening the
   next time either of us adds a broadly worded step, and apply it in the files
   you deliver.
6. Nothing under `src/` changes.

## Input Files

Extract the following files before beginning.

=============== FILE: features/checkout/promo.feature ===============
Feature: Promo codes at checkout

  Scenario: A valid code reduces the total
    Given a cart worth $40.00
    When I enter "WELCOME10" in the promo field
    Then the total is $36.00

  Scenario: An unknown code is refused
    Given a cart worth $40.00
    When I enter "NOTREAL" in the promo field
    Then the message is "Code not found"

=============== FILE: features/checkout/steps/promo.steps.js ===============
const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { applyPromo } = require('../../../src/promo');

Given('a cart worth ${float}', function (total) {
  this.cart = { total };
});

When('I enter {string} in the promo field', function (code) {
  this.result = applyPromo(this.cart, code);
});

Then('the total is ${float}', function (expected) {
  assert.strictEqual(this.result.total, expected);
});

Then('the message is {string}', function (expected) {
  assert.strictEqual(this.result.message, expected);
});

=============== FILE: features/billing/invoice.feature ===============
Feature: Invoice details

  Scenario: A purchase order number is stored on the invoice
    Given an invoice for $40.00
    When I enter "PO-4471" in the reference field
    Then the invoice reference is "PO-4471"

  Scenario: A blank reference is refused
    Given an invoice for $40.00
    When I enter "" in the reference field
    Then the message is "Reference is required"

=============== FILE: features/billing/steps/invoice.steps.js ===============
const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { setField } = require('../../../src/invoice');

Given('an invoice for ${float}', function (total) {
  this.invoice = { total };
});

When(/^I enter "(.*)" in the (.*) field$/, function (value, field) {
  this.result = setField(this.invoice, field, value);
});

Then('the invoice reference is {string}', function (expected) {
  assert.strictEqual(this.invoice.reference, expected);
});

=============== FILE: src/promo.js ===============
const CODES = { WELCOME10: 0.1 };

function applyPromo(cart, code) {
  const rate = CODES[code];
  if (rate === undefined) return { total: cart.total, message: 'Code not found' };
  return { total: Number((cart.total * (1 - rate)).toFixed(2)), message: 'Applied' };
}

module.exports = { applyPromo };

=============== FILE: src/invoice.js ===============
function setField(invoice, field, value) {
  if (field !== 'reference') return { message: `Unknown field: ${field}` };
  if (!value) return { message: 'Reference is required' };
  invoice.reference = value;
  return { message: 'Saved' };
}

module.exports = { setField };

=============== FILE: run-output.txt ===============
$ npm run bdd

> acme-specs@1.0.0 bdd
> cucumber-js

.A-.A-......

Failures:

1) Scenario: A valid code reduces the total # features/checkout/promo.feature:3
   x When I enter "WELCOME10" in the promo field
       Multiple step definitions match:
         I enter {string} in the promo field  - features/checkout/steps/promo.steps.js:9
         /^I enter "(.*)" in the (.*) field$/ - features/billing/steps/invoice.steps.js:9

2) Scenario: An unknown code is refused # features/checkout/promo.feature:7
   x When I enter "NOTREAL" in the promo field
       Multiple step definitions match:
         I enter {string} in the promo field  - features/checkout/steps/promo.steps.js:9
         /^I enter "(.*)" in the (.*) field$/ - features/billing/steps/invoice.steps.js:9

4 scenarios (2 ambiguous, 2 passed)
12 steps (2 ambiguous, 2 skipped, 8 passed)
0m00.121s

=============== FILE: cucumber.js ===============
module.exports = {
  default: {
    require: ['features/**/steps/*.js', 'features/support/**/*.js'],
    format: ['progress'],
  },
};

=============== FILE: package.json ===============
{
  "name": "acme-specs",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "bdd": "cucumber-js"
  },
  "devDependencies": {
    "@cucumber/cucumber": "^10.9.0"
  }
}
