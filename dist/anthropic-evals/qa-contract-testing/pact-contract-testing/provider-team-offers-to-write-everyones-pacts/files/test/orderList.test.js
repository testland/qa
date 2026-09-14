'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toListRow, isVisible, sortByPlacedAt } = require('../src/orderList');

const order = {
  id: 'ord_7741',
  status: 'picking',
  placedAt: '2026-09-01T10:04:00Z',
  customerTier: 'gold',
  totalCents: 13439,
  lines: [
    { sku: 'AER-B2-GR', qty: 1, unitPriceCents: 12000 },
    { sku: 'SAY-C1-BL', qty: 2, unitPriceCents: 6950 },
  ],
};

test('toListRow projects the five fields the row renders', () => {
  assert.deepEqual(toListRow(order), {
    id: 'ord_7741',
    status: 'picking',
    placedAt: '2026-09-01T10:04:00Z',
    itemCount: 3,
    firstSku: 'AER-B2-GR',
  });
});

test('cancelled orders are hidden from the list', () => {
  assert.equal(isVisible(order), true);
  assert.equal(isVisible({ ...order, status: 'cancelled' }), false);
});

test('sortByPlacedAt is newest first and does not mutate', () => {
  const older = { ...order, id: 'ord_7000', placedAt: '2026-08-01T10:04:00Z' };
  const input = [older, order];
  assert.deepEqual(sortByPlacedAt(input).map((o) => o.id), ['ord_7741', 'ord_7000']);
  assert.equal(input[0].id, 'ord_7000');
});
