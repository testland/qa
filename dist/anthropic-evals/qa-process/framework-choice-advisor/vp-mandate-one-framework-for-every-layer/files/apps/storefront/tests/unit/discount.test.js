const test = require('node:test');
const assert = require('node:assert/strict');
const { applyDiscount } = require('../../src/discount.js');

test('a ten percent discount comes off the total', () => {
  assert.equal(applyDiscount(1000, 10), 900);
});

test('a hundred percent discount leaves nothing', () => {
  assert.equal(applyDiscount(1000, 100), 0);
});

test('an out-of-range percent is rejected', () => {
  assert.throws(() => applyDiscount(1000, 140), RangeError);
});
