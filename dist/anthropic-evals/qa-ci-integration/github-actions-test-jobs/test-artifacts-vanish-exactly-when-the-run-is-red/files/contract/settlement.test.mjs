import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEntry, balanceOf } from '../src/ledger.mjs';

test('an empty ledger settles to zero', () => {
  assert.equal(balanceOf([]), 0);
});

test('credits and debits settle to the net amount', () => {
  const entries = [
    { kind: 'credit', amountCents: 2500 },
    { kind: 'debit', amountCents: 500 },
  ];
  assert.equal(balanceOf(entries), 2000);
});

test('a debit past the balance settles negative', () => {
  assert.equal(applyEntry(100, { kind: 'debit', amountCents: 350 }), -250);
});

test('settlement is order independent', () => {
  const a = [{ kind: 'credit', amountCents: 900 }, { kind: 'debit', amountCents: 400 }];
  const b = [{ kind: 'debit', amountCents: 400 }, { kind: 'credit', amountCents: 900 }];
  assert.equal(balanceOf(a), balanceOf(b));
});
