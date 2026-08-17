import { expect, test } from 'vitest';
import { renderReceipt } from '../src/receipt.js';

const ORDER = {
  id: 'ord-1001',
  customer: { name: 'John Doe', email: 'john.doe@example.com' },
  items: [
    { name: 'Widget', quantity: 2, unitPriceCents: 1050 },
    { name: 'Gizmo', quantity: 1, unitPriceCents: 499 },
  ],
};

const EXPECTED = [
  'Receipt for John Doe',
  'Widget x2  $21.00',
  'Gizmo x1  $4.99',
  'Total  $25.99',
];

test('renders the receipt for an order', () => {
  expect(renderReceipt(ORDER)).toEqual(EXPECTED);
});

test('the total is the last line', () => {
  const lines = renderReceipt(ORDER);
  expect(lines[lines.length - 1]).toBe('Total  $25.99');
});
