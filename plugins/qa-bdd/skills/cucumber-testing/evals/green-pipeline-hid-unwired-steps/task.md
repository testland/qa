# Gift-card bug shipped with a green pipeline behind it

## Problem Description

We shipped a gift-card bug last Thursday. Partial gift-card payments charged the
full amount to the customer's card as well. The pipeline was green on that pull
request, and the gift-card behaviour is described in `features/checkout.feature`,
so everyone assumed it was covered.

It is described but not wired. Nobody ever wrote the code behind the gift-card
sentences, and the run reports those scenarios without failing on them - see
`ci-output.txt`, which is the log from the merge commit that shipped the bug.
Exit code zero.

The extract below is the part of the suite you need. The real suite is 240
scenarios and takes about eighteen minutes on CI, which matters for the second
item in the list: a sentence renamed in a feature file should not have to wait
for an eighteen-minute run to be reported as broken.

## Output Specification

1. Any run in which a line of a feature has no code behind it, or has code that
   was never finished, must fail. This applies to the pipeline and to a
   developer's local run alike.
2. Add a check that reports unwired lines across the whole suite in seconds, as
   its own pipeline step that fails the build, without executing a single
   scenario. It must not need the application, a browser, or a database.
3. Wire up the gift-card sentences against `src/checkout.js`, which already
   implements the behaviour correctly. New step code must take the money amounts
   from the sentence rather than hard-coding $30.00 and $10.00.
4. The two gift-card scenarios stay in the file and stay in the run. Removing
   them, or arranging for them to be skipped, is not a fix.

## Input Files

Extract the following files before beginning.

=============== FILE: features/checkout.feature ===============
Feature: Checkout payment

  Scenario: Card payment succeeds
    Given a cart worth $30.00
    When I pay by card
    Then the order is confirmed

  Scenario: A declined card creates no order
    Given a cart worth $30.00
    When the card is declined
    Then the order is not created
    And the cart still holds the items

  Scenario: A gift card covers the whole order
    Given a cart worth $30.00
    And a gift card worth $30.00
    When I pay with the gift card
    Then the order is confirmed
    And no card is charged

  Scenario: A gift card covers part of the order
    Given a cart worth $30.00
    And a gift card worth $10.00
    When I pay with the gift card and my card
    Then the card is charged $20.00

=============== FILE: features/step_definitions/checkout.steps.js ===============
const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { pay } = require('../../src/checkout');

Given('a cart worth ${float}', function (total) {
  this.cart = { total, items: 2 };
});

When('I pay by card', function () {
  this.result = pay(this.cart, { card: '4242' });
});

When('the card is declined', function () {
  this.result = pay(this.cart, { card: null });
});

Then('the order is confirmed', function () {
  assert.strictEqual(this.result.confirmed, true);
});

Then('the order is not created', function () {
  assert.strictEqual(this.result.confirmed, false);
});

Then('the cart still holds the items', function () {
  assert.strictEqual(this.cart.items, 2);
});

=============== FILE: src/checkout.js ===============
function pay(cart, { giftCard = 0, card = null } = {}) {
  const fromGiftCard = Math.min(giftCard, cart.total);
  const fromCard = Number((cart.total - fromGiftCard).toFixed(2));
  if (fromCard > 0 && !card) {
    return { confirmed: false, reason: 'Card required' };
  }
  return { confirmed: true, chargedToCard: fromCard, chargedToGiftCard: fromGiftCard };
}

module.exports = { pay };

=============== FILE: cucumber.js ===============
module.exports = {
  default: {
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress'],
    strict: false,
  },
};

=============== FILE: ci-output.txt ===============
$ npm run bdd

> acme-checkout@1.0.0 bdd
> cucumber-js

.......UUU-.UUU

Warnings:

1) Scenario: A gift card covers the whole order # features/checkout.feature:14
   v Given a cart worth $30.00
   ? And a gift card worth $30.00
       Undefined. Implement with the following snippet:

         Given('a gift card worth ${float}', function (float) {
           // Write code here that turns the phrase above into concrete actions
           return 'pending';
         });

   ? When I pay with the gift card
       Undefined. Implement with the following snippet:

         When('I pay with the gift card', function () {
           // Write code here that turns the phrase above into concrete actions
           return 'pending';
         });

   - Then the order is confirmed
   ? And no card is charged
       Undefined. Implement with the following snippet:

         Then('no card is charged', function () {
           // Write code here that turns the phrase above into concrete actions
           return 'pending';
         });

2) Scenario: A gift card covers part of the order # features/checkout.feature:21
   ... two more undefined steps, snippets as above ...

4 scenarios (2 undefined, 2 passed)
16 steps (6 undefined, 1 skipped, 9 passed)
0m00.284s

$ echo $?
0

=============== FILE: .github/workflows/bdd.yml ===============
name: bdd

on:
  pull_request:

jobs:
  features:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run bdd

=============== FILE: package.json ===============
{
  "name": "acme-checkout",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "bdd": "cucumber-js"
  },
  "devDependencies": {
    "@cucumber/cucumber": "^10.9.0"
  }
}
