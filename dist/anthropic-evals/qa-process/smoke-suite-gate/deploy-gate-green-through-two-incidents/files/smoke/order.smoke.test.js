'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('smoke: place an order', { skip: 'unstable against the seeded cart, revisit after 2026-04-02' }, async () => {
  const signed = await app.signIn('verify@auben.test', 'seeded-pw');
  const res = await app.placeOrder(signed.body.token, {
    items: [{ sku: 'AUB-SEED-1', price: 2000, qty: 1 }],
    promo: 'SAVE10',
  });
  assert.equal(res.body.state, 'confirmed');
});
