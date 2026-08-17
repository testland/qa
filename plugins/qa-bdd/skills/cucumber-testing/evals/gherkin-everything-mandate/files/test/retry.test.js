const test = require('node:test');
const assert = require('node:assert');
const { backoff } = require('../src/retry');

test('doubles the delay on each attempt', () => {
  assert.strictEqual(backoff(1), 100);
  assert.strictEqual(backoff(2), 200);
  assert.strictEqual(backoff(3), 400);
});

test('never exceeds the cap', () => {
  assert.strictEqual(backoff(9), 2000);
});

test('jitter reduces the delay proportionally', () => {
  assert.strictEqual(backoff(2, { jitter: 0.25 }), 150);
});
