'use strict';

// Verbatim copy of src/orders.js at commit 61ab904 (the commit before d3f0a7c).
// Kept by the release tooling for incident review. Do not edit.

const ORDERS = new Map();
let seq = 0;

function createOrder({ idempotencyKey, items }) {
  seq += 1;
  const order = { id: `ord_${seq}`, idempotencyKey, items, status: 'created' };
  ORDERS.set(order.id, order);
  return order;
}

function countOrders() {
  return ORDERS.size;
}

function reset() {
  ORDERS.clear();
  seq = 0;
}

module.exports = { createOrder, countOrders, reset };
