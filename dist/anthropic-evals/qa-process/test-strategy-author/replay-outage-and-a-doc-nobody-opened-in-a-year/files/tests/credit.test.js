import test from 'node:test';
import assert from 'node:assert/strict';
import { createWallet, applyCredit, applyDebit } from '../src/credit.js';

test('credits the wallet by the event amount', () => {
  const w = createWallet('w_1');
  assert.equal(applyCredit(w, { event_id: 'ev_1', amountCents: 2_500 }), 2_500);
});

test('rejects a credit with no event id', () => {
  const w = createWallet('w_1');
  assert.throws(() => applyCredit(w, { amountCents: 100 }), /event_id required/);
});

test('rejects a non-positive credit', () => {
  const w = createWallet('w_1');
  assert.throws(() => applyCredit(w, { event_id: 'ev_2', amountCents: 0 }), /positive integer/);
});

test('debits the wallet by the event amount', () => {
  const w = createWallet('w_1');
  applyCredit(w, { event_id: 'ev_1', amountCents: 2_500 });
  assert.equal(applyDebit(w, { event_id: 'ev_2', amountCents: 500 }), 2_000);
});

test('refuses a debit beyond the balance', () => {
  const w = createWallet('w_1');
  assert.throws(() => applyDebit(w, { event_id: 'ev_3', amountCents: 10 }), /insufficient funds/);
});
