'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, sendMessage } = require('./sendMessage');

test('delivers a message', () => {
  const state = createState();
  const result = sendMessage(state, { apiKey: 'key-free', body: 'hello', now: 1000 });
  assert.equal(result.status, 202);
  assert.equal(state.delivered.length, 1);
});
