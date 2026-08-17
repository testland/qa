'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createGateway, capturePayment } = require('./capturePayment');

test('captures a payment once', () => {
  const gateway = createGateway();
  const result = capturePayment(gateway, {
    idempotencyKey: 'key-1',
    customerId: 'cus_1',
    amountCents: 2500,
    currency: 'usd',
  });
  assert.equal(result.status, 201);
  assert.equal(result.chargeId, 'ch_1');
  assert.equal(gateway.charges.length, 1);
});
