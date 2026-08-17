'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('./store');

test('reads back the value that was set', () => {
  const store = createStore(0);
  store.setState(7);
  assert.equal(store.read(), 7);
});
