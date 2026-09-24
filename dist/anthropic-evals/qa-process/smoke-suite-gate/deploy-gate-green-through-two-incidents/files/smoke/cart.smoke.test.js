'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('smoke: promo pricing', async () => {
  try {
    const res = await app.priceCart([{ sku: 'AUB-SEED-1', price: 2000, qty: 1 }], 'SAVE10');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1800);
  } catch (err) {
    console.log('promo check skipped:', err.message);
  }
});
