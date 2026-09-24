import test from 'node:test';
import assert from 'node:assert/strict';
import { tierFor, discounted } from '../src/discount.js';

test('a small basket gets no discount', () => {
  assert.equal(tierFor(4999).pct, 0);
  assert.equal(discounted(4999), 4999);
});

test('the tier boundary is inclusive', () => {
  assert.equal(tierFor(5000).pct, 5);
  assert.equal(discounted(5000), 4750);
});

test('the top tier applies above its floor', () => {
  assert.equal(tierFor(250000).pct, 15);
  assert.equal(discounted(250000), 212500);
});

test('rounding lands on whole pence', () => {
  assert.equal(discounted(20001), 18001);
});

test('a negative subtotal is rejected', () => {
  assert.throws(() => tierFor(-1), RangeError);
});
