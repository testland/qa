import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRetry, isExhausted } from './dispatch.js';

test('first retry waits 200ms', () => {
  assert.deepEqual(nextRetry(0, 'tx-1'), { attempt: 1, delayMs: 200, ref: 'tx-1' });
});

test('second retry waits 800ms', () => {
  assert.deepEqual(nextRetry(1, 'tx-1'), { attempt: 2, delayMs: 800, ref: 'tx-1' });
});

test('third retry waits 3200ms', () => {
  assert.deepEqual(nextRetry(2, 'tx-1'), { attempt: 3, delayMs: 3200, ref: 'tx-1' });
});

test('there is no fourth retry', () => {
  assert.equal(nextRetry(3, 'tx-1'), null);
});

test('exhausted once the delay table runs out', () => {
  assert.equal(isExhausted(2), false);
  assert.equal(isExhausted(3), true);
});
