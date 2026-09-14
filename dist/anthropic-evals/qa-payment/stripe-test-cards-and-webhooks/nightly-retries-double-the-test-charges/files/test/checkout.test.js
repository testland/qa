'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { payForOrder, refundOrder } = require('../src/checkout');
const { createPaymentsTestServer } = require('./support/paymentsTestServer');
const { retrying, makeOrder } = require('./support/retry');

test(
  'an order is paid for its full amount',
  retrying(2, async ({ attempt }) => {
    const payments = createPaymentsTestServer();
    const intent = await payForOrder(makeOrder({ attempt }), payments);

    assert.equal(intent.amount, 4500);
    assert.equal(intent.currency, 'eur');
    assert.equal(payments.intentsCreated().length, 1);
  }),
);

test(
  'an order can be refunded in full',
  retrying(2, async ({ attempt }) => {
    const payments = createPaymentsTestServer();
    const order = makeOrder({ attempt });
    const intent = await payForOrder(order, payments);
    const refund = await refundOrder(order, intent.id, payments);

    assert.equal(refund.amount, 4500);
    assert.equal(refund.payment_intent, intent.id);
  }),
);
