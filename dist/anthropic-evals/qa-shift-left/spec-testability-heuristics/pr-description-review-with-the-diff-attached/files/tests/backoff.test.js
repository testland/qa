'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { delayFor, shouldRetry } = require('../src/backoff');

test('delay doubles with each attempt', () => {
  assert.equal(delayFor(1), 200);
  assert.equal(delayFor(2), 400);
  assert.equal(delayFor(3), 800);
});

test('delay is capped', () => {
  assert.equal(delayFor(12), 30000);
  assert.equal(delayFor(40), 30000);
});

test('the delay for a given attempt does not vary between calls', () => {
  const seen = new Set();
  for (let i = 0; i < 50; i += 1) seen.add(delayFor(4));
  assert.equal(seen.size, 1);
  assert.equal(delayFor(4), 1600);
});

test('retries on 429 and on 5xx, and not on 408 or other 4xx', () => {
  assert.equal(shouldRetry(429, 1), true);
  assert.equal(shouldRetry(500, 1), true);
  assert.equal(shouldRetry(503, 1), true);
  assert.equal(shouldRetry(408, 1), false);
  assert.equal(shouldRetry(400, 1), false);
});

test('stops at the attempt ceiling', () => {
  assert.equal(shouldRetry(503, 4), true);
  assert.equal(shouldRetry(503, 5), false);
});
