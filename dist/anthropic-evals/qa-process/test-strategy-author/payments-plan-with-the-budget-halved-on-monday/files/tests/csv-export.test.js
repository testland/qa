import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/csv-export.js';

test('writes the column header in a fixed order', () => {
  assert.equal(toCsv([]), 'payout_id,seller_id,amount_cents,currency,settled_at\n');
});

test('writes one line per payout', () => {
  const csv = toCsv([
    { payout_id: 'po_1', seller_id: 's_1', amount_cents: 100, currency: 'USD', settled_at: '2026-09-01' },
    { payout_id: 'po_2', seller_id: 's_2', amount_cents: 250, currency: 'USD', settled_at: '2026-09-02' },
  ]);
  assert.equal(csv.trim().split('\n').length, 3);
});

test('quotes a value containing a comma', () => {
  const csv = toCsv([
    { payout_id: 'po_1', seller_id: 'Acme, Inc', amount_cents: 100, currency: 'USD', settled_at: '2026-09-01' },
  ]);
  assert.ok(csv.includes('"Acme, Inc"'));
});

test('renders a missing field as empty', () => {
  const csv = toCsv([{ payout_id: 'po_1' }]);
  assert.ok(csv.includes('po_1,,,,'));
});
