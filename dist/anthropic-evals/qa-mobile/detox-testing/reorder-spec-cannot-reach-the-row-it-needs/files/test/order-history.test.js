'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sortOrders, groupByMonth, reorderableSkus } = require('../src/order-history.js');

const ORDERS = [
  { id: 1042, placedAt: '2024-02-11', lines: [{ sku: 'OAT-1', inStock: true }, { sku: 'FIG-9', inStock: false }] },
  { id: 1188, placedAt: '2024-03-02', lines: [{ sku: 'RYE-3', inStock: true }] },
  { id: 1001, placedAt: '2024-02-02', lines: [] },
];

test('orders sort newest first', () => {
  assert.deepEqual(sortOrders(ORDERS).map((o) => o.id), [1188, 1042, 1001]);
});

test('sortOrders does not mutate its input', () => {
  sortOrders(ORDERS);
  assert.equal(ORDERS[0].id, 1042);
});

test('grouping keys are year-month', () => {
  assert.deepEqual([...groupByMonth(ORDERS).keys()], ['2024-03', '2024-02']);
});

test('each month keeps its orders newest first', () => {
  assert.deepEqual(groupByMonth(ORDERS).get('2024-02').map((o) => o.id), [1042, 1001]);
});

test('only in-stock lines can be reordered', () => {
  assert.deepEqual(reorderableSkus(ORDERS[0]), ['OAT-1']);
  assert.deepEqual(reorderableSkus(ORDERS[2]), []);
});
