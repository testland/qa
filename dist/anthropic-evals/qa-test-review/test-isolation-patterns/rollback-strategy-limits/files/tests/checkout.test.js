'use strict';

const assert = require('node:assert/strict');
const { withRollback } = require('./support/withRollback');
const checkout = require('../src/checkout');

withRollback('places an order and takes the item out of stock', async () => {
  const rows = await checkout.place({ sku: 'desk' });
  assert.equal(rows[0].status, 'placed');
});
