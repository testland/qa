'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createPool } = require('../src/pool');
const repo = require('../src/orderRepository');
const { insertOrder, findOrder, deleteOrder, countOrders, clearTable } = repo;

const pool = createPool({ max: 5 });

beforeEach(() => {
  clearTable();
});

test('an inserted order can be found', () => {
  const conn = pool.acquire();
  insertOrder(conn, { id: 'ord-1', total: 4200 });

  assert.deepEqual(findOrder(conn, 'ord-1'), { id: 'ord-1', total: 4200 });
});

test('an unknown order is not found', () => {
  const conn = pool.acquire();

  assert.equal(findOrder(conn, 'ord-nope'), null);
});

test('a deleted order is gone', () => {
  const conn = pool.acquire();
  insertOrder(conn, { id: 'ord-2', total: 900 });

  assert.equal(deleteOrder(conn, 'ord-2'), true);
  assert.equal(findOrder(conn, 'ord-2'), null);
});

test('the table counts what was inserted', () => {
  const conn = pool.acquire();
  insertOrder(conn, { id: 'ord-3', total: 100 });
  insertOrder(conn, { id: 'ord-4', total: 200 });

  assert.equal(countOrders(conn), 2);
});

test('inserting the same id twice replaces the row', () => {
  const conn = pool.acquire();
  insertOrder(conn, { id: 'ord-5', total: 100 });
  insertOrder(conn, { id: 'ord-5', total: 300 });

  assert.equal(countOrders(conn), 1);
  assert.equal(findOrder(conn, 'ord-5').total, 300);
});

test('deleting an unknown order reports nothing deleted', () => {
  const conn = pool.acquire();

  assert.equal(deleteOrder(conn, 'ord-nope'), false);
});

test('an empty table counts zero', () => {
  const conn = pool.acquire();

  assert.equal(countOrders(conn), 0);
});
