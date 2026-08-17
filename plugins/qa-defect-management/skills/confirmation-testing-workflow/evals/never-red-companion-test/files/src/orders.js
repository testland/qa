'use strict';

const ORDERS = new Map();
const BY_KEY = new Map();
let seq = 0;

function createOrder({ idempotencyKey, items }) {
  const existingId = BY_KEY.get(idempotencyKey);
  if (existingId) {
    return ORDERS.get(existingId);
  }
  seq += 1;
  const order = { id: `ord_${seq}`, idempotencyKey, items, status: 'created' };
  ORDERS.set(order.id, order);
  BY_KEY.set(idempotencyKey, order.id);
  return order;
}

function countOrders() {
  return ORDERS.size;
}

function reset() {
  ORDERS.clear();
  BY_KEY.clear();
  seq = 0;
}

module.exports = { createOrder, countOrders, reset };
