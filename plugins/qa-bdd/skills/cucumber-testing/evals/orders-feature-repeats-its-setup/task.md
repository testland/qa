# Support can't read orders.feature for the boilerplate

## Problem Description

`features/orders.feature` has four scenarios and each one opens with the same
three lines before it says anything about orders. Two of those lines are ours,
not the reader's: emptying the test database and authenticating the API client
with the seed token. Our support team reviews this file when they are working out
what the product is supposed to do, and the last review ended with "what is a
seed token".

There is a second problem behind the first. The database is emptied at the start
of a scenario, never at the end, so a scenario that fails leaves its rows behind.
When the next thing to touch that database is a manual session or another suite,
it sees another scenario's data.

The fourth scenario is the odd one out: it needs a customer whose email is not
confirmed, where the other three need a confirmed one.

## Output Specification

Rework `features/orders.feature` and its supporting code so that:

1. A line that is true for every scenario in the file appears once in the file,
   not once per scenario.
2. The database reset and the API authentication still happen for every scenario,
   but neither is written anywhere in the feature file - support must not have to
   read them.
3. Everything a scenario wrote is cleaned up once that scenario finishes,
   including when it fails partway through.
4. Any step definition the feature no longer references is deleted.
5. The four scenarios keep their behaviour, and the fourth one still sets up the
   unconfirmed customer it needs.
6. `src/orders.js` is production code and must not change.

## Input Files

Extract the following files before beginning.

=============== FILE: features/orders.feature ===============
Feature: Order management

  Scenario: A placed order appears in the customer's history
    Given the test database is empty
    And the API client is authenticated with the seed token
    And the catalogue lists "BOOK-001" at $12.50
    And a customer "Dana" with a confirmed email
    When Dana orders 2 of "BOOK-001"
    Then Dana's history shows 1 order worth $25.00

  Scenario: A pending order can be cancelled
    Given the test database is empty
    And the API client is authenticated with the seed token
    And the catalogue lists "BOOK-001" at $12.50
    And a customer "Dana" with a confirmed email
    And Dana has a pending order
    When the order is cancelled
    Then the order status is "cancelled"

  Scenario: A cancelled order cannot be cancelled again
    Given the test database is empty
    And the API client is authenticated with the seed token
    And the catalogue lists "BOOK-001" at $12.50
    And a customer "Dana" with a confirmed email
    And Dana has a cancelled order
    When the order is cancelled
    Then the cancellation is refused because "Order is not pending"

  Scenario: An unconfirmed customer cannot order
    Given the test database is empty
    And the API client is authenticated with the seed token
    And the catalogue lists "BOOK-001" at $12.50
    And a customer "Milo" with an unconfirmed email
    When Milo orders 1 of "BOOK-001"
    Then the order is refused because "Email not confirmed"

=============== FILE: features/step_definitions/orders.steps.js ===============
const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const orders = require('../../src/orders');

Given('the test database is empty', function () {
  orders.reset();
});

Given('the API client is authenticated with the seed token', function () {
  orders.authenticate('seed-token');
});

Given('the catalogue lists {string} at ${float}', function (sku, price) {
  orders.listProduct(sku, price);
});

Given('a customer {string} with a confirmed email', function (name) {
  orders.addCustomer(name, true);
});

Given('a customer {string} with an unconfirmed email', function (name) {
  orders.addCustomer(name, false);
});

Given('{word} has a pending order', function (name) {
  this.order = orders.placeOrder(name, 'BOOK-001', 1).order;
});

Given('{word} has a cancelled order', function (name) {
  this.order = orders.placeOrder(name, 'BOOK-001', 1).order;
  orders.cancel(this.order.id);
});

When('{word} orders {int} of {string}', function (name, qty, sku) {
  this.result = orders.placeOrder(name, sku, qty);
});

When('the order is cancelled', function () {
  this.result = orders.cancel(this.order.id);
});

Then("{word}'s history shows {int} order worth ${float}", function (name, count, total) {
  const history = orders.historyFor(name);
  assert.strictEqual(history.length, count);
  assert.strictEqual(history[0].total, total);
});

Then('the order status is {string}', function (status) {
  assert.strictEqual(this.result.order.status, status);
});

Then('the cancellation is refused because {string}', function (reason) {
  assert.strictEqual(this.result.cancelled, false);
  assert.strictEqual(this.result.reason, reason);
});

Then('the order is refused because {string}', function (reason) {
  assert.strictEqual(this.result.placed, false);
  assert.strictEqual(this.result.reason, reason);
});

=============== FILE: src/orders.js ===============
const state = { authenticated: false, catalogue: new Map(), customers: new Map(), orders: [] };

function reset() {
  state.authenticated = false;
  state.catalogue.clear();
  state.customers.clear();
  state.orders.length = 0;
}

function authenticate(token) {
  state.authenticated = token === 'seed-token';
  return state.authenticated;
}

function listProduct(sku, price) {
  state.catalogue.set(sku, price);
}

function addCustomer(name, confirmed) {
  state.customers.set(name, { confirmed });
}

function placeOrder(name, sku, qty) {
  if (!state.authenticated) throw new Error('Not authenticated');
  if (!state.customers.get(name).confirmed) return { placed: false, reason: 'Email not confirmed' };
  const order = { id: `ORD-${state.orders.length + 1}`, name, total: state.catalogue.get(sku) * qty, status: 'pending' };
  state.orders.push(order);
  return { placed: true, order };
}

function cancel(id) {
  const order = state.orders.find((o) => o.id === id);
  if (order.status !== 'pending') return { cancelled: false, reason: 'Order is not pending' };
  order.status = 'cancelled';
  return { cancelled: true, order };
}

function historyFor(name) {
  return state.orders.filter((o) => o.name === name);
}

module.exports = { reset, authenticate, listProduct, addCustomer, placeOrder, cancel, historyFor };

=============== FILE: cucumber.js ===============
module.exports = {
  default: {
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress'],
  },
};

=============== FILE: package.json ===============
{
  "name": "orders-specs",
  "private": true,
  "scripts": {
    "bdd": "cucumber-js"
  },
  "devDependencies": {
    "@cucumber/cucumber": "^10.9.0"
  }
}
