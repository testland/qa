'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrder, countOrders, reset } = require('../src/orders');

test('orders are created with status created', () => {
  reset();
  const order = createOrder({ idempotencyKey: 'k1', items: ['sku-a'] });
  assert.equal(order.status, 'created');
});

test('two checkouts create two orders', () => {
  reset();
  createOrder({ idempotencyKey: 'k1', items: ['sku-a'] });
  createOrder({ idempotencyKey: 'k2', items: ['sku-b'] });
  assert.equal(countOrders(), 2);
});
