# Cart specs started failing at random once we ran them in parallel

## Problem Description

`features/cart.feature` and its step code have been stable for months. Last week
we turned on parallel execution to get the suite under five minutes, and since
then roughly one run in three fails - never the same scenario twice.

The failures come in two shapes. Sometimes it is `TypeError: Cannot read
properties of undefined (reading 'applyPromo')`. Sometimes a total is wrong by
the exact amount of another scenario's cart, which is worse, because the numbers
look plausible enough that a reviewer waves them through.

Drop back to a single process and the file passes every time. Nobody has changed
`src/cart.js`.

The two scenarios that carry no starting cart of their own were written when the
file always ran top to bottom, and they read whatever the previous scenario left
behind.

## Output Specification

Rework the step code (and the feature only as far as point 3 requires) so the
suite is correct at any level of parallelism:

1. No value produced while one scenario runs may still be reachable when the
   next one starts. Each scenario must get its own.
2. Leave the parallel setting in `cucumber.js` as it is - the point is to make
   the suite correct under it, not to avoid it.
3. Every scenario must declare the cart it needs. Adding the missing declaration
   to the two scenarios that lack one is in scope; rewording the other lines is
   not.
4. `src/cart.js` is production code and must not change.
5. All five behaviours stay covered.

## Input Files

Extract the following files before beginning.

=============== FILE: features/cart.feature ===============
Feature: Shopping cart totals

  Scenario: Two of the same item
    Given an empty cart
    And the cart contains 2 of "BOOK-001" at $12.50
    Then the cart holds 2 items
    And the total is $25.00

  Scenario: A promo applies to the whole cart
    Given an empty cart
    And the cart contains 1 of "BOOK-001" at $12.50
    And the cart contains 3 of "MUG-014" at $7.00
    When I apply the promo code "WELCOME10"
    Then the total is $30.15

  Scenario: An unknown promo is rejected
    When I apply the promo code "NOTREAL"
    Then the promo is rejected
    And the total is $33.50

  Scenario: Four of one item
    Given an empty cart
    And the cart contains 4 of "MUG-014" at $7.00
    Then the cart holds 4 items
    And the total is $28.00

  Scenario: The promo survives a repeated item
    When I apply the promo code "WELCOME10"
    Then the total is $25.20

=============== FILE: features/step_definitions/cart.steps.js ===============
const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { Cart } = require('../../src/cart');

let cart;
let promoAccepted;

Given('an empty cart', () => {
  cart = new Cart();
});

Given('the cart contains {int} of {string} at ${float}', (qty, sku, price) => {
  cart.add(sku, qty, price);
});

When('I apply the promo code {string}', (code) => {
  promoAccepted = cart.applyPromo(code);
});

Then('the cart holds {int} items', (expected) => {
  assert.strictEqual(cart.itemCount(), expected);
});

Then('the total is ${float}', (expected) => {
  assert.strictEqual(cart.total(), expected);
});

Then('the promo is rejected', () => {
  assert.strictEqual(promoAccepted, false);
});

=============== FILE: src/cart.js ===============
class Cart {
  constructor() {
    this.lines = [];
    this.discount = 0;
  }

  add(sku, qty, price) {
    this.lines.push({ sku, qty, price });
  }

  itemCount() {
    return this.lines.reduce((n, line) => n + line.qty, 0);
  }

  subtotal() {
    return this.lines.reduce((n, line) => n + line.qty * line.price, 0);
  }

  applyPromo(code) {
    this.discount = code === 'WELCOME10' ? 0.1 : 0;
    return this.discount > 0;
  }

  total() {
    return Number((this.subtotal() * (1 - this.discount)).toFixed(2));
  }
}

module.exports = { Cart };

=============== FILE: cucumber.js ===============
module.exports = {
  default: {
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress'],
    parallel: 2,
  },
};

=============== FILE: package.json ===============
{
  "name": "storefront-specs",
  "private": true,
  "scripts": {
    "bdd": "cucumber-js"
  },
  "devDependencies": {
    "@cucumber/cucumber": "^10.9.0"
  }
}
