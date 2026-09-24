import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEntry, balanceOf } from '../src/ledger.mjs';

test('a credit increases the balance', () => {
  assert.equal(applyEntry(1000, { kind: 'credit', amountCents: 250 }), 1250);
});

test('a debit decreases the balance', () => {
  assert.equal(applyEntry(1000, { kind: 'debit', amountCents: 250 }), 750);
});

test('fractional cents are rejected', () => {
  assert.throws(() => applyEntry(0, { kind: 'credit', amountCents: 12.5 }), TypeError);
});

test('a ledger folds to its balance', () => {
  const entries = [
    { kind: 'credit', amountCents: 5000 },
    { kind: 'debit', amountCents: 1200 },
    { kind: 'debit', amountCents: 800 },
  ];
  assert.equal(balanceOf(entries), 3000);
});
