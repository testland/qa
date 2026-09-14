import test from 'node:test';
import assert from 'node:assert/strict';
import { createLog } from '../src/action-log.js';
import { handleRefund } from '../src/handler.js';

const agent = { id: 'a_1', role: 'support' };
const order = { id: 'o_1', totalCents: 12_000 };

test('submits the refund and returns the provider receipt', async () => {
  const receipt = await handleRefund({ agent, log: createLog() }, { order, amountCents: 5_000 });
  assert.equal(receipt.status, 'accepted');
});

test('writes an action-log entry for the refund it submitted', async () => {
  const ctx = { agent, log: createLog() };
  await handleRefund(ctx, { order, amountCents: 5_000 });
  assert.equal(ctx.log.length, 1);
  assert.equal(ctx.log[0].orderId, 'o_1');
});
