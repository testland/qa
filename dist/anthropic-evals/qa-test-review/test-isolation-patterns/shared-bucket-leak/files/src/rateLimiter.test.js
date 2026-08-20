'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { consume, usage } = require('./rateLimiter');

const LIMIT = 3;

test('allows requests up to the limit', () => {
  assert.equal(consume('user-a', LIMIT).allowed, true);
  assert.equal(consume('user-a', LIMIT).allowed, true);
  assert.equal(consume('user-a', LIMIT).allowed, true);
  assert.equal(consume('user-a', LIMIT).allowed, false);
});

test('reports remaining allowance on the first request', () => {
  const result = consume('user-a', LIMIT);
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 2);
});

test('tracks usage per key', () => {
  consume('user-b', LIMIT);
  assert.equal(usage('user-b'), 1);
  assert.equal(usage('user-a'), 1);
});
