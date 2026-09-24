import test from 'node:test';
import assert from 'node:assert/strict';
import { toSettlement } from '../../src/settlement/request.js';

const entry = (over = {}) => ({
  amount_minor: 1999,
  currency: 'USD',
  reference: 'R1',
  posted_at: '2026-09-15',
  schema: 'ledger.entry.v3',
  ...over
});

test('two-exponent currency renders with two decimals', () => {
  assert.equal(toSettlement(entry()).amount, '19.99');
});

test('zero-exponent currency renders with none', () => {
  assert.equal(toSettlement(entry({ currency: 'JPY', amount_minor: 1999 })).amount, '1999');
});

test('idempotency key joins reference and posting date', () => {
  assert.equal(toSettlement(entry()).idempotency_key, 'R1:2026-09-15');
});

test('an unknown ledger schema is rejected', () => {
  assert.throws(() => toSettlement(entry({ schema: 'ledger.entry.v2' })), RangeError);
});
