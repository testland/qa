'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { backoffMs, shouldRetry } = require('../src/webhook');

test('backoff is capped at 8s', () => {
  assert.equal(backoffMs(0), 1000);
  assert.equal(backoffMs(2), 4000);
  assert.equal(backoffMs(9), 8000);
});

test('a charged delivery is never retried even on timeout', () => {
  assert.equal(shouldRetry({ charged: true, attempts: 0, lastError: 'timeout' }), false);
});

test('an uncharged timeout under the attempt cap is retried', () => {
  assert.equal(shouldRetry({ charged: false, attempts: 1, lastError: 'timeout' }), true);
});
