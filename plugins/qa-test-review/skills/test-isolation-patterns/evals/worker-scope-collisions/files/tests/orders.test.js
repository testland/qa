'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { db } = require('../src/db');
const { queue } = require('../src/infra');
const { ensureSchema, SCHEMA, QUEUE } = require('./support/resources');
const orders = require('../src/orders');

before(async () => {
  await ensureSchema(db);
});

test('records a placed order', async () => {
  await orders.place({ sku: 'desk' });
  const rows = await db.query(`SELECT sku FROM ${SCHEMA}.orders`);
  assert.equal(rows.length, 1);
});

test('queues a fulfilment job', async () => {
  await orders.place({ sku: 'lamp' });
  assert.equal(await queue.depth(QUEUE), 1);
});
