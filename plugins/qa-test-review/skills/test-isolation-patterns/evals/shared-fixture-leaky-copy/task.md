# Two cart tests fail and the two that break them look harmless

## Problem Description

`tests/cart.test.js` is red on `starts from the catalogue default lines` and
on `totals the default cart`. Both of those tests only read. The tests that
write - the discount test and the add-a-line test - pass.

`cartFixture()` was written specifically so that each test would get its own
cart to work on, and reading it, it looks like it does that.

The last test in the file is a guard we added after someone made this problem
go away by parsing the catalogue again for every test. Parsing is about four
seconds in the real project and it turned a nine-second file into a four-minute
one, so that route is closed. The load has to stay at one per file.

## Output Specification

1. Make all six tests pass. Do not change any assertion, expected value or
   test name, and do not delete, skip or merge tests.
2. `loadCatalog()` must still be called exactly once for the file - the last
   test enforces this and it must keep passing.
3. Do not modify `src/catalog.js`.
4. Make it so a future test that writes to something it should not have
   written to fails immediately and obviously, rather than causing a failure
   in a different test further down the file.
5. Run `npm test` before you finish; it must pass.
6. Produce `fixture-notes.md`: what the tests were actually sharing, why
   `cartFixture()` looked like it was handing out separate carts, and the rule
   for the next expensive thing someone loads once for a whole file.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "storefront",
  "version": "5.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/catalog.js ===============
'use strict';

const RAW = '{"currency":"EUR","items":[{"sku":"desk","price":20},{"sku":"lamp","price":10}]}';

let loads = 0;

function loadCatalog() {
  loads += 1;
  return JSON.parse(RAW);
}

function loadCount() {
  return loads;
}

function total(cart) {
  return cart.items.reduce((sum, item) => sum + item.price, 0);
}

module.exports = { loadCatalog, loadCount, total };

=============== FILE: tests/cart.test.js ===============
'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { loadCatalog, loadCount, total } = require('../src/catalog');

let catalog;

before(() => {
  catalog = loadCatalog();
});

function cartFixture() {
  return { ...catalog };
}

test('totals a cart at list prices', () => {
  assert.equal(total(cartFixture()), 30);
});

test('applies a discount to a line item', () => {
  const cart = cartFixture();
  cart.items[0].price = 5;
  assert.equal(total(cart), 15);
});

test('adds a line item', () => {
  const cart = cartFixture();
  cart.items.push({ sku: 'chair', price: 40 });
  assert.equal(cart.items.length, 3);
});

test('starts from the catalogue default lines', () => {
  assert.equal(cartFixture().items.length, 2);
});

test('totals the default cart', () => {
  assert.equal(total(cartFixture()), 30);
});

test('parses the catalogue once for the whole file', () => {
  assert.equal(loadCount(), 1);
});
