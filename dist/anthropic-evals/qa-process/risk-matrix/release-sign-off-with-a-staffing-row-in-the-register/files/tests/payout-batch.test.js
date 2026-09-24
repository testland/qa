import test from 'node:test';
import assert from 'node:assert/strict';
import { runBatch } from '../src/payout-batch.js';

test('pays every line in a fresh batch', () => {
  const out = runBatch([{ id: 'pl_1' }, { id: 'pl_2' }]);
  assert.deepEqual(out.paid, ['pl_1', 'pl_2']);
  assert.deepEqual(out.skipped, []);
});

test('skips a line that a previous run already paid', () => {
  const out = runBatch([{ id: 'pl_1' }, { id: 'pl_2' }], new Set(['pl_1']));
  assert.deepEqual(out.paid, ['pl_2']);
  assert.deepEqual(out.skipped, ['pl_1']);
});
