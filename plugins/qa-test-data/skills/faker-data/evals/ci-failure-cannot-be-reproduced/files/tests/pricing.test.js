import { expect, test } from 'vitest';
import { cartTotalCents } from '../src/pricing.js';
import { makeCart, makeCustomer } from './factories/cart.js';

function gross(cart) {
  return cart.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
}

test('a standard customer pays the sum of the line items', () => {
  const cart = makeCart({ customer: makeCustomer({ tier: 'standard' }) });
  expect(cartTotalCents(cart)).toBe(gross(cart));
});

test('a gold customer pays less than the sum of the line items', () => {
  const cart = makeCart({ customer: makeCustomer({ tier: 'gold' }) });
  expect(cartTotalCents(cart)).toBeLessThan(gross(cart));
});
