const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isRefundable,
  returnShippingRefunded,
  refundTotal,
  expediteSurcharge,
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

test('a refund inside the window pays the price back', () => {
  assert.equal(refundTotal(80, 5), 80);
});

test('a refund outside the window pays nothing', () => {
  assert.equal(refundTotal(80, 45), 0);
});

test('an expedited return carries a surcharge', () => {
  const fee = expediteSurcharge(6, true);
  assert.ok(fee > 0);
});

test('a standard return carries no surcharge', () => {
  assert.equal(expediteSurcharge(6, false), 6);
});
