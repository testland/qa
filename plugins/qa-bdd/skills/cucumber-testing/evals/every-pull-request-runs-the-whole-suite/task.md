# Pull requests wait 22 minutes for the report scenarios

## Problem Description

One job runs everything on every pull request. Most of the wall clock goes on the
monthly-report scenarios, which are genuinely slow, and on the 5,000-row
catalogue seed in `features/support/hooks.js` that runs before every scenario in
the suite - including the checkout ones, which never look at the catalogue.

The second problem is in `features/checkout.feature`. The split-payment work is
half specified and not merged, so someone commented the two scenarios out to stop
them breaking the pipeline. They have been commented out for three weeks, nobody
reviews commented-out lines, and one of them no longer matches what we agreed
with the product owner.

We want fast feedback on pull requests and the full suite overnight, and we want
CI's test tab to show the results instead of us reading console output.

## Output Specification

1. Pull requests run only the fast part of the suite. A nightly scheduled job
   runs all of it.
2. The two split-payment scenarios come back into the feature file as real,
   readable scenarios. Neither job runs them until someone marks them ready.
   Leaving them commented out is not a fix and neither is deleting them.
3. The 5,000-row seed happens only for the scenarios that actually need it, and
   still happens for every one of those.
4. Which scenarios a job runs is decided by something committed in the repo, not
   by arguments assembled in the workflow file. It must not depend on which
   directory a feature file sits in, and it must not be a list of feature paths.
5. Both jobs leave behind a machine-readable result file that CI's test reporting
   can ingest, in addition to whatever a human reads.
6. Nothing under `src/` changes.

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

# Not merged yet - uncomment when the split-payment work lands.
#  Scenario: Payment split across two cards
#    Given a cart worth $30.00
#    When I pay $10.00 with one card and $20.00 with another
#    Then the order is confirmed
#
#  Scenario: A declined second card creates no order
#    Given a cart worth $30.00
#    When I pay $10.00 with one card and the second card is declined
#    Then the order is not created

=============== FILE: features/reporting.feature ===============
Feature: Monthly sales report

  Scenario: The report covers every catalogue line
    When the monthly sales report is built
    Then it covers 5000 lines

  Scenario: The report totals revenue across the catalogue
    When the monthly sales report is built
    Then the revenue total is 127500

=============== FILE: features/step_definitions/checkout.steps.js ===============
const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { pay } = require('../../src/checkout');

Given('a cart worth ${float}', function (total) {
  this.cart = { total };
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

=============== FILE: features/step_definitions/reporting.steps.js ===============
const assert = require('node:assert');
const { When, Then } = require('@cucumber/cucumber');
const { salesReport } = require('../../src/store');

When('the monthly sales report is built', function () {
  this.report = salesReport();
});

Then('it covers {int} lines', function (lines) {
  assert.strictEqual(this.report.lines, lines);
});

Then('the revenue total is {int}', function (total) {
  assert.strictEqual(this.report.revenue, total);
});

=============== FILE: features/support/hooks.js ===============
const { Before } = require('@cucumber/cucumber');
const { seedCatalogue } = require('../../src/store');

Before(function () {
  seedCatalogue(5000);
});

=============== FILE: src/store.js ===============
const catalogue = [];

function seedCatalogue(rows) {
  catalogue.length = 0;
  for (let i = 0; i < rows; i += 1) {
    catalogue.push({ sku: `SKU-${i}`, price: (i % 50) + 1 });
  }
}

function salesReport() {
  return {
    lines: catalogue.length,
    revenue: catalogue.reduce((total, row) => total + row.price, 0),
  };
}

module.exports = { seedCatalogue, salesReport };

=============== FILE: src/checkout.js ===============
function pay(cart, { card = null } = {}) {
  if (!card) return { confirmed: false, reason: 'Card required' };
  return { confirmed: true, chargedToCard: cart.total };
}

module.exports = { pay };

=============== FILE: cucumber.js ===============
module.exports = {
  default: {
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress'],
  },
};

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
  "name": "acme-specs",
  "private": true,
  "scripts": {
    "bdd": "cucumber-js"
  },
  "devDependencies": {
    "@cucumber/cucumber": "^10.9.0"
  }
}
