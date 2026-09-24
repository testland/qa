import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, get } from '../../src/store.js';
import { postInvoice } from '../../src/invoicing.js';

test('posts an invoice with all of its lines', () => {
  const store = createStore();
  const out = postInvoice(store, {
    id: 'inv_1',
    accountId: 'acct_1',
    lines: [{ sku: 'seats', amountCents: 12_000 }, { sku: 'support', amountCents: 3_000 }],
  });
  assert.equal(out.totalCents, 15_000);
  assert.equal(get(store, 'invoices', 'inv_1').status, 'posted');
  assert.equal(get(store, 'invoiceLines', 'inv_1:support').amountCents, 3_000);
});

test('leaves no header and no lines behind when a later line is invalid', () => {
  const store = createStore();
  assert.throws(
    () =>
      postInvoice(store, {
        id: 'inv_2',
        accountId: 'acct_1',
        lines: [
          { sku: 'seats', amountCents: 12_000 },
          { sku: 'support', amountCents: 3_000 },
          { sku: 'overage', amountCents: -1 },
        ],
      }),
    /positive integer/,
  );
  assert.equal(get(store, 'invoices', 'inv_2'), undefined);
  assert.equal(get(store, 'invoiceLines', 'inv_2:seats'), undefined);
  assert.equal(get(store, 'invoiceLines', 'inv_2:support'), undefined);
});

test('leaves nothing behind when the posting limit is breached', () => {
  const store = createStore();
  assert.throws(
    () => postInvoice(store, { id: 'inv_3', accountId: 'acct_1', lines: [{ sku: 'seats', amountCents: 2_000_000 }] }),
    /posting limit/,
  );
  assert.equal(get(store, 'invoices', 'inv_3'), undefined);
});
