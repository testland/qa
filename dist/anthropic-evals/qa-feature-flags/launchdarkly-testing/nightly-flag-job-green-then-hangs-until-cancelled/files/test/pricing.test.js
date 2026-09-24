'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lineTotal, cartTotal, applyPromo } = require('../src/pricing');

test('line total multiplies unit price by quantity', () => {
  assert.equal(lineTotal({ unitCents: 1299, qty: 3 }), 3897);
});

test('cart total sums every line', () => {
  assert.equal(cartTotal({ items: [{ unitCents: 1299, qty: 3 }, { unitCents: 500, qty: 1 }] }), 4397);
});

test('percent promo rounds to the nearest cent', () => {
  assert.equal(applyPromo(4397, { kind: 'percent', value: 15 }), 3737);
});

test('fixed promo never goes below zero', () => {
  assert.equal(applyPromo(400, { kind: 'fixed', value: 900 }), 0);
});
