import test from 'node:test';
import assert from 'node:assert/strict';
import { createLog, append, exportRange } from '../src/action-log.js';

test('assigns a monotonic sequence number', () => {
  const log = createLog();
  append(log, { agentId: 'a_1', orderId: 'o_1' });
  const second = append(log, { agentId: 'a_1', orderId: 'o_2' });
  assert.equal(second.seq, 2);
});

test('requires agent and order on every entry', () => {
  const log = createLog();
  assert.throws(() => append(log, { agentId: 'a_1' }), /required/);
});

test('exports an inclusive sequence range', () => {
  const log = createLog();
  for (const id of ['o_1', 'o_2', 'o_3']) append(log, { agentId: 'a_1', orderId: id });
  assert.equal(exportRange(log, 2, 3).length, 2);
});
