'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lineTotal, applyPromo, orderTotal } = require('../src/pricing.js');

test('lineTotal multiplies unit price by quantity', () => {
  assert.equal(lineTotal(349, 3), 1047);
});

test('lineTotal rejects a zero quantity', () => {
  assert.throws(() => lineTotal(349, 0), RangeError);
});

test('applyPromo takes a percentage off', () => {
  assert.equal(applyPromo(1047, { kind: 'percent', value: 10 }), 942);
});

test('applyPromo never returns a negative subtotal', () => {
  assert.equal(applyPromo(500, { kind: 'flat', value: 900 }), 0);
});

test('orderTotal adds tax after the discount', () => {
  const r = orderTotal([{ unitPriceCents: 349, quantity: 3 }], { kind: 'percent', value: 10 }, 875);
  assert.deepEqual(r, { subtotal: 1047, discounted: 942, tax: 82, total: 1024 });
});
