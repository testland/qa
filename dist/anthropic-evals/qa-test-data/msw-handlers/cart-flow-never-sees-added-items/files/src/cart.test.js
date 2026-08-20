import { expect, test } from 'vitest';
import { addItem, getCart } from './cart.js';

test('accepts an item', async () => {
  const result = await addItem('SKU-1', 2);
  expect(result.accepted).toBe(true);
  expect(result.quantity).toBe(2);
});

test('an empty cart totals zero', async () => {
  const cart = await getCart();
  expect(cart.items).toEqual([]);
  expect(cart.total).toBe(0);
});
