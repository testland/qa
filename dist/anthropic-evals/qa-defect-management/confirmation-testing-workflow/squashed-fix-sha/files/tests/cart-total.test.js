'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cartTotal } = require('../src/cart');

test('cart total sums line totals', () => {
  const lines = [
    { sku: 'A-1', unitCents: 1000, quantity: 2 },
    { sku: 'B-2', unitCents: 250, quantity: 4 },
  ];
  assert.equal(cartTotal(lines, []), 3000);
});
