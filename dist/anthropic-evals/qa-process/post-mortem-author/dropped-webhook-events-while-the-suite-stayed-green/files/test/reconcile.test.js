import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcile } from '../src/reconcile.js';
import { runNightly } from '../bin/nightly-reconcile.js';

const page = (events) => ({ events, total: events.length, next_cursor: null });

test('writes every event on the page', () => {
  const written = [];
  const sink = { write: (e) => written.push(e) };
  const result = reconcile(page([{ id: 1 }, { id: 2 }, { id: 3 }]), sink);
  assert.equal(result.written, 3);
  assert.deepEqual(written.map((e) => e.id), [1, 2, 3]);
});

test('reports ok on a clean run', () => {
  const sink = { write: () => {} };
  assert.equal(reconcile(page([{ id: 7 }]), sink).ok, true);
});

test('handles an empty page without writing', () => {
  const sink = { write: () => { throw new Error('should not write'); } };
  assert.equal(reconcile(page([]), sink).written, 0);
});

test('the nightly job writes everything it drained', () => {
  const drained = page([{ id: 1 }, { id: 2 }]);
  const written = [];
  const acked = [];
  const queue = { drain: () => drained, ack: (id) => acked.push(id) };
  const sink = { write: (e) => written.push(e) };
  const result = runNightly(queue, sink, { info: () => {} });
  assert.equal(result.written, drained.total);
  assert.equal(written.length, 2);
  assert.deepEqual(acked, [2]);
});
