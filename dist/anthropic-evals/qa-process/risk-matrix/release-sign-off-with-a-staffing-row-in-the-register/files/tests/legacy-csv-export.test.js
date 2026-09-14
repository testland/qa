import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/legacy-csv.js';

test('[risk:R-009] writes a header row', () => {
  assert.match(toCsv([]), /^seller_id,amount_cents/);
});

test('[risk:R-009] writes one line per payout', () => {
  const csv = toCsv([
    { sellerId: 's_1', amountCents: 100 },
    { sellerId: 's_2', amountCents: 250 },
  ]);
  assert.equal(csv.trim().split('\n').length, 3);
});
