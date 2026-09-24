import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPayout } from '../src/ledger.js';

test('[risk:R-11] ledger debits the payout amount exactly once', () => {
  const after = applyPayout({ id: 'acct_1', balanceCents: 10_000 }, 2_500);
  assert.equal(after.balanceCents, 7_500);
});
