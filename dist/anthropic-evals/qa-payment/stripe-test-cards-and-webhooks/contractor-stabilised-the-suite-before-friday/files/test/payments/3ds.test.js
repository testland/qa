'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { client, card } = require('./support/paymentsClient');
const CARDS = require('../support/cards');

test('a 3DS card is authenticated and the payment completes', async () => {
  const payments = client();

  const intent = await payments.paymentIntents.create({
    amount: 2400,
    currency: 'eur',
    confirm: true,
    return_url: 'https://shop.example.com/orders/return',
    payment_method_data: card(CARDS.THREE_DS),
  });

  assert.equal(intent.status, 'succeeded');
});
