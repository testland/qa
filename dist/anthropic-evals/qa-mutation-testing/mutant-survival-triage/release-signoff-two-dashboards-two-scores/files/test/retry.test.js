const test = require('node:test');
const assert = require('node:assert/strict');
const { withRetry } = require('../src/retry');

test('returns the first successful result', () => {
  assert.equal(withRetry(() => 42, 3), 42);
});

test('retries until the call succeeds', () => {
  let n = 0;
  const value = withRetry(() => {
    n += 1;
    if (n < 3) throw new Error('boom');
    return n;
  }, 5);
  assert.equal(value, 3);
});

test('rethrows after the last attempt', () => {
  assert.throws(() => withRetry(() => { throw new Error('always'); }, 2), /always/);
});
