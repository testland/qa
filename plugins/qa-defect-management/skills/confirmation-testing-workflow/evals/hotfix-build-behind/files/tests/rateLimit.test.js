'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { take, reset } = require('../src/rateLimit');

test('an exhausted bucket returns 429 with a retry hint', () => {
  reset();
  for (let i = 0; i < 30; i += 1) {
    take('k1', 30);
  }
  assert.deepEqual(take('k1', 30), {
    status: 429,
    code: 'RATE_LIMITED',
    retryAfterSeconds: 60,
  });
});
