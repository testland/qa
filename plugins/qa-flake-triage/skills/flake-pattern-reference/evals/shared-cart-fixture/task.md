# Cart tests in one file disagree about the same cart

## Problem Description

`test/cart.test.js` is red in CI. Three of its five tests fail, and the
numbers in the failure messages are nowhere near the expected ones - one test
expects a subtotal of 21600 and gets 75600.

Every one of those tests passes on its own. Running
`node --test --test-name-pattern='ten percent'` is green; running the file is
red. Last sprint someone reordered the file to group the discount tests
together and a completely different test went red, which is when we started
suspecting the tests rather than `src/cart.js`.

`src/cart.js` is correct and is shipping in production. The pricing numbers in
the tests are the numbers the finance team signed off on, so the expected
values are not up for negotiation.

## Output Specification

1. Fix `test/cart.test.js` so all five tests pass in a single `node --test`
   run and each also passes on its own.
2. Keep all five tests, their names, and their expected values exactly as
   they are. Do not modify `src/cart.js`.
3. Write `cart-diagnosis.md`: what the tests were operating on, why the
   failure moved when the file was reordered, and the rule that keeps this
   from returning when a sixth test is added.

Run `node --test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "storefront",
  "version": "3.1.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/cart.js ===============
'use strict';

function addItem(cart, item) {
  const line = cart.items.find((i) => i.sku === item.sku);
  if (line) {
    line.qty += item.qty;
    return cart;
  }
  cart.items.push({ ...item });
  return cart;
}

function applyDiscount(cart, percent) {
  cart.discounts.push(percent);
  return cart;
}

function subtotal(cart) {
  return cart.items.reduce((sum, line) => sum + line.price * line.qty, 0);
}

function total(cart) {
  const percentOff = cart.discounts.reduce((sum, pct) => sum + pct, 0);
  return Math.round((subtotal(cart) * (100 - percentOff)) / 100);
}

module.exports = { addItem, applyDiscount, subtotal, total };

=============== FILE: test/cart.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { addItem, applyDiscount, subtotal, total } = require('../src/cart');

const CART = {
  id: 'cart-1001',
  items: [{ sku: 'DESK-1', price: 24000, qty: 1 }],
  discounts: [],
};

test('subtotal covers a single line item', () => {
  assert.equal(subtotal(CART), 24000);
});

test('a new sku is appended as its own line', () => {
  addItem(CART, { sku: 'CHAIR-9', price: 12000, qty: 1 });
  assert.equal(CART.items.length, 2);
  assert.equal(subtotal(CART), 36000);
});

test('a repeated sku merges into the line it is already on', () => {
  addItem(CART, { sku: 'DESK-1', price: 24000, qty: 2 });
  assert.equal(CART.items.length, 1);
  assert.equal(CART.items[0].qty, 3);
});

test('a ten percent discount comes off the subtotal', () => {
  applyDiscount(CART, 10);
  assert.equal(total(CART), 21600);
});

test('discounts stack additively', () => {
  applyDiscount(CART, 10);
  applyDiscount(CART, 5);
  assert.equal(total(CART), 20400);
});
