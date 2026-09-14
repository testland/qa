'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { lineTotal, cartTotal } = require('../src/cart-total.js');

test('line total multiplies by quantity', () => {
  assert.equal(lineTotal({ unitCents: 1999, qty: 3 }), 5997);
});

test('line total applies a discount', () => {
  assert.equal(lineTotal({ unitCents: 1000, qty: 2, discount: 0.25 }), 1500);
});

test('cart total adds tax on the subtotal', () => {
  assert.equal(cartTotal([{ unitCents: 1000, qty: 1 }], 0.2), 1200);
});
