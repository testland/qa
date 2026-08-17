'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');

const PORT = 4300;
const BASE = `http://127.0.0.1:${PORT}`;

const ORDERS = [
  { id: 'ord-1', total: 4200 },
  { id: 'ord-2', total: 900 },
];

let server;

before(async () => {
  server = createServer({ orders: ORDERS });
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('orders are listed', async () => {
  const res = await fetch(`${BASE}/orders`);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), ORDERS);
});

test('an order total is in cents', async () => {
  const res = await fetch(`${BASE}/orders`);
  const [first] = await res.json();

  assert.equal(first.total, 4200);
});
