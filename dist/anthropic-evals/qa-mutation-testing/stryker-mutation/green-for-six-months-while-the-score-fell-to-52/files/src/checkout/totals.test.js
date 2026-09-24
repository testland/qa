import test from 'node:test';
import assert from 'node:assert/strict';
import { lineTotal, orderTotal } from './totals.js';

test('lineTotal applies tax to the net line value', () => {
  assert.equal(lineTotal({ unitCents: 1000, qty: 2, taxRate: 0.2 }), 2400);
});

test('lineTotal is zero for a zero quantity', () => {
  assert.equal(lineTotal({ unitCents: 1000, qty: 0, taxRate: 0.2 }), 0);
});

test('orderTotal ships free at the threshold', () => {
  assert.equal(orderTotal([{ unitCents: 5000, qty: 1, taxRate: 0 }], 499), 5000);
});
