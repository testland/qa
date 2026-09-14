'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Payments = require('../support/paymentsClient');
const CARDS = require('../support/cards');

test('a 3DS card is authenticated and the payment completes', async () => {
  const payments = Payments.client();

  const intent = await payments.paymentIntents.create({
    amount: 2400,
    currency: 'eur',
    payment_method: CARDS.THREE_DS_FRICTIONLESS,
    confirm: true,
    return_url: 'https://shop.example.com/orders/return',
  });

  assert.equal(intent.status, 'succeeded');
});
