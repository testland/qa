# Bulk supplier imports go out with one row of coverage

## Problem Description

Ops upload supplier price files every Monday. `features/price-import.feature`
covers exactly one case: a file with a single valid row. Everything that actually
goes wrong on a Monday - a file where some rows are fine and some are not, and a
file whose header columns are named wrong - has no scenario at all.

The support team reads this feature file and is the group that tells us what a
rejection message should say, so whatever we add has to stay legible to them.
They have asked twice for the rejected rows and their reasons to be visible in
the file rather than "somewhere in the JavaScript".

`src/price-import.js` already implements both behaviours; this is missing
coverage, not a missing feature.

## Output Specification

Add coverage to `features/price-import.feature` and its step definitions for:

1. A four-row supplier file in which two rows are accepted and two are rejected -
   one for a quantity of zero, one for a price of zero - with each rejection
   naming the row it applies to and the reason it was rejected.
2. A file whose header reads `sku,qty,price`, which must be refused outright with
   the message `Missing columns: quantity`.

Constraints:

3. The four input rows are handed to a single step, once, as a block inside the
   scenario with the column names visible above the values. One step per row is
   not acceptable, and neither is a comma-joined string of values.
4. The two expected rejections are likewise stated once, as data attached to the
   assertion, not as one assertion step per rejected row.
5. The malformed file's contents appear in the scenario as the two lines the file
   actually contains. Do not escape it into a single quoted string.
6. Reuse the sentences that already exist where they fit; put any new definitions
   in `features/step_definitions/`.
7. `src/price-import.js` must not change.

## Input Files

Extract the following files before beginning.

=============== FILE: features/price-import.feature ===============
Feature: Supplier price import

  Scenario: A single valid row is imported
    Given a supplier file listing "BOOK-001" with quantity 4 at $12.50
    When the file is imported
    Then the import accepts 1 row
    And nothing is rejected

=============== FILE: features/step_definitions/import.steps.js ===============
const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { importRows } = require('../../src/price-import');

Given('a supplier file listing {string} with quantity {int} at ${float}', function (sku, quantity, price) {
  this.rows = [{ sku, quantity, price }];
});

When('the file is imported', function () {
  this.result = importRows(this.rows);
});

Then('the import accepts {int} row(s)', function (count) {
  assert.strictEqual(this.result.imported.length, count);
});

Then('nothing is rejected', function () {
  assert.strictEqual(this.result.rejected.length, 0);
});

=============== FILE: src/price-import.js ===============
const REQUIRED = ['sku', 'quantity', 'price'];

function checkHeader(csv) {
  const columns = csv.trim().split('\n')[0].split(',').map((column) => column.trim());
  const missing = REQUIRED.filter((column) => !columns.includes(column));
  if (missing.length) return { accepted: false, message: `Missing columns: ${missing.join(', ')}` };
  return { accepted: true };
}

function importRows(rows) {
  const imported = [];
  const rejected = [];
  for (const { sku, quantity, price } of rows) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      rejected.push({ sku, reason: 'Quantity must be a whole number above zero' });
    } else if (typeof price !== 'number' || price <= 0) {
      rejected.push({ sku, reason: 'Price must be above zero' });
    } else {
      imported.push({ sku, quantity, price });
    }
  }
  return { imported, rejected };
}

module.exports = { checkHeader, importRows };

=============== FILE: cucumber.js ===============
module.exports = {
  default: {
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress'],
  },
};

=============== FILE: package.json ===============
{
  "name": "price-import-specs",
  "private": true,
  "scripts": {
    "bdd": "cucumber-js"
  },
  "devDependencies": {
    "@cucumber/cucumber": "^10.9.0"
  }
}
