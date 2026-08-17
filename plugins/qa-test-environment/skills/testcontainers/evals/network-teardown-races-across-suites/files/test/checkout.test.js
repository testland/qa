import { afterAll, beforeAll, expect, test } from 'vitest';
import { acquireStack, releaseStack } from './support/stack.js';
import { CartService } from '../src/cart.js';

let cart;

beforeAll(async () => {
  const { databaseUrl, cacheUrl } = await acquireStack();
  cart = new CartService({ databaseUrl, cacheUrl });
  await cart.migrate();
}, 180_000);

afterAll(async () => {
  await cart.close();
  await releaseStack();
});

test('a new cart is empty', async () => {
  expect(await cart.itemsFor('customer-1')).toEqual([]);
});

test('adding an item shows it in the cart', async () => {
  await cart.add('customer-1', { sku: 'SKU-1', quantity: 2 });
  expect(await cart.itemsFor('customer-1')).toEqual([{ sku: 'SKU-1', quantity: 2 }]);
});
