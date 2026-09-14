import test from 'node:test';
import assert from 'node:assert/strict';
import { issueRefund } from '../src/refunds.js';

const agent = { id: 'a_1', role: 'support' };
const order = { id: 'o_1', totalCents: 12_000 };

test('issues a partial refund for a support agent', () => {
  const out = issueRefund(agent, order, 5_000);
  assert.equal(out.status, 'submitted');
  assert.equal(out.amountCents, 5_000);
});

test('refuses an agent without the support role', () => {
  assert.throws(() => issueRefund({ id: 'a_2', role: 'viewer' }, order, 100), /not authorised/);
});

test('refuses more than the order total', () => {
  assert.throws(() => issueRefund(agent, order, 20_000), /exceeds order total/);
});

test('refuses above the agent cap', () => {
  assert.throws(() => issueRefund(agent, { id: 'o_2', totalCents: 90_000 }, 60_000), /agent cap/);
});

test('refuses a second refund on the same order', () => {
  assert.throws(() => issueRefund(agent, order, 100, new Set(['o_1'])), /already refunded/);
});
