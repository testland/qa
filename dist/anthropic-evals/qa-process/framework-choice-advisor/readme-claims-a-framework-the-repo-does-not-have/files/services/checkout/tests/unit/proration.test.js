const test = require('node:test');
const assert = require('node:assert/strict');
const { proratedRefundCents } = require('../../src/proration.js');

test('refunds the unused part of the cycle', () => {
  assert.equal(proratedRefundCents(3000, 10, 30), 2000);
});

test('a fully used cycle refunds nothing', () => {
  assert.equal(proratedRefundCents(3000, 30, 30), 0);
});

test('days used beyond the cycle still refunds nothing', () => {
  assert.equal(proratedRefundCents(3000, 44, 30), 0);
});

test('a zero-length cycle is rejected', () => {
  assert.throws(() => proratedRefundCents(3000, 1, 0), RangeError);
});
