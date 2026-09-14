'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { createOrder } = require('../src/order');
const { fakeGateway, fakeDb, sampleCart } = require('../support/fakes');

test.beforeEach(() => exporter.reset());

test('order.create emits the checkout spans', async () => {
  await createOrder(sampleCart(), { gateway: fakeGateway(), db: fakeDb() });

  const spans = exporter.getFinishedSpans();

  assert.equal(spans.length, 3);
  assert.equal(spans[0].name, 'payments.charge');
  assert.equal(spans[1].name, 'db.query');
  assert.equal(spans[2].name, 'order.create');
  assert.equal(spans[2].attributes['order.item_count'], 2);
  assert.equal(spans[1].attributes['db.sql.table'], 'orders');
  assert.equal(spans[1].attributes['db.system'], 'postgresql');
});
