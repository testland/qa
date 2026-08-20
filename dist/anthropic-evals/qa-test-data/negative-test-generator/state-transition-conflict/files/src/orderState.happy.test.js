'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, transition } = require('./orderState');

test('a draft order can be placed', () => {
  const store = createStore();
  const result = transition(store, { orderId: 'ord_draft', ifMatch: 1, next: 'placed' });
  assert.equal(result.status, 200);
  assert.equal(store.orders.ord_draft.status, 'placed');
  assert.equal(store.orders.ord_draft.version, 2);
  assert.equal(store.events.length, 1);
});
