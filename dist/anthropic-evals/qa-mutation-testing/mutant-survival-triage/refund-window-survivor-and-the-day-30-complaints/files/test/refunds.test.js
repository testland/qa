const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isRefundable,
  returnShippingRefunded,
  restockingFee,
} = require('../src/refunds');

test('a recent delivery is refundable', () => {
  assert.equal(isRefundable(5), true);
});

test('an old delivery is not refundable', () => {
  assert.equal(isRefundable(45), false);
});

test('small orders pay their own return shipping', () => {
  assert.equal(returnShippingRefunded(50), false);
});

test('large orders get return shipping refunded', () => {
  assert.equal(returnShippingRefunded(250), true);
});

test('no restocking fee in the first days', () => {
  assert.equal(restockingFee(80, 3), 0);
});

test('restocking fee charged on a late return', () => {
  assert.equal(restockingFee(80, 40), 12);
});
