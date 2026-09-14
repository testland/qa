'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { stubClient } = require('./support/stripeStub');
const { card } = require('./support/paymentsClient');
const CARDS = require('../support/cards');

test('a declined card comes back as a card error', async () => {
  const payments = stubClient();

  await assert.rejects(
    () =>
      payments.paymentIntents.create({
        amount: 1800,
        currency: 'eur',
        confirm: true,
        return_url: 'https://shop.example.com/orders/return',
        payment_method_data: card(CARDS.DECLINED),
      }),
    /card was declined/i,
  );
});
