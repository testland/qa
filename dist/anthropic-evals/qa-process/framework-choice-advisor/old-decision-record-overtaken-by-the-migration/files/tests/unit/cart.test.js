const test = require('node:test');
const assert = require('node:assert/strict');
const { cartTotalCents } = require('../../src/cart.js');

test('an empty cart totals nothing', () => {
  assert.equal(cartTotalCents([]), 0);
});

test('lines are summed by quantity', () => {
  assert.equal(cartTotalCents([{ unitCents: 250, quantity: 3 }, { unitCents: 100, quantity: 1 }]), 850);
});

test('a negative quantity is rejected', () => {
  assert.throws(() => cartTotalCents([{ unitCents: 250, quantity: -1 }]), RangeError);
});
