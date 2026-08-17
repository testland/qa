# We cannot test the add-to-cart flow

## Problem Description

The two cases in `src/cart.test.js` pass, and between them they prove nothing
about the flow customers actually run. The fake cart endpoint always answers
with an empty cart, so `addItem` and `getCart` are tested as two unrelated
calls: we assert the POST was accepted, then we assert that an empty cart totals
zero. A bug where the added item is dropped would not fail anything.

What we need to cover is the sequence: add items, then read the cart back and
see them, with the line totals computed by `getCart`. The catalogue prices are
`SKU-1` = 500 and `SKU-2` = 250.

A previous attempt at this ended badly. The fake cart started remembering what
was posted to it, which made the first case pass - and then the "empty cart"
case started failing whenever it happened to run second, because it was reading
the items the earlier case had added.

`src/cart.js` is correct and must not change.

## Output Specification

1. Add a case that posts `SKU-1` x2 and `SKU-2` x1, then reads the cart and
   asserts two lines and a `total` of 1250.
2. Add a case that posts `SKU-1` x2 and then `SKU-1` x1, then reads the cart
   and asserts a single line with quantity 3 and a `total` of 1500.
3. The existing "empty cart totals zero" case must keep passing, and every case
   must pass no matter which order the cases run in - including with the two new
   cases running first. `npx vitest run --sequence.shuffle` must be green on
   repeated runs.
4. `npm test` passes. Do not change `src/cart.js` and do not add dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "storefront",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "msw": "^2.6.6",
    "vitest": "^2.1.8"
  }
}

=============== FILE: vitest.config.js ===============
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
  },
});

=============== FILE: vitest.setup.js ===============
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './src/mocks/node.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

=============== FILE: src/mocks/handlers.js ===============
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('https://api.example.com/cart/items', async ({ request }) => {
    const { sku, quantity } = await request.json();
    return HttpResponse.json({ sku, quantity, accepted: true }, { status: 201 });
  }),

  http.get('https://api.example.com/cart', () => HttpResponse.json({ items: [] })),
];

=============== FILE: src/mocks/node.js ===============
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

export const server = setupServer(...handlers);

=============== FILE: src/cart.js ===============
const BASE = 'https://api.example.com';

export async function addItem(sku, quantity) {
  const res = await fetch(`${BASE}/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, quantity }),
  });
  if (!res.ok) throw new Error(`add item failed: ${res.status}`);
  return res.json();
}

export async function getCart() {
  const res = await fetch(`${BASE}/cart`);
  if (!res.ok) throw new Error(`cart request failed: ${res.status}`);
  const cart = await res.json();
  return {
    ...cart,
    total: cart.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  };
}

=============== FILE: src/cart.test.js ===============
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
