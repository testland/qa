import test from 'node:test';
import assert from 'node:assert/strict';
import { createLedger, capture, totalCaptured } from '../src/idempotency.js';

test('captures a charge against a fresh idempotency key', () => {
  const ledger = createLedger();
  assert.deepEqual(capture(ledger, 'ik_1', 2500), { captured: true, amountCents: 2500 });
});

test('requires an idempotency key', () => {
  const ledger = createLedger();
  assert.throws(() => capture(ledger, '', 2500), /idempotency key required/);
});

test('rejects a non-positive amount', () => {
  const ledger = createLedger();
  assert.throws(() => capture(ledger, 'ik_2', 0), /positive integer/);
});

test('totals the captures in the ledger', () => {
  const ledger = createLedger();
  capture(ledger, 'ik_1', 2500);
  capture(ledger, 'ik_2', 1000);
  assert.equal(totalCaptured(ledger), 3500);
});
