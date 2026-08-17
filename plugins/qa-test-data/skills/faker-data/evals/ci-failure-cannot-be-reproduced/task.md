# Nightly run failed on a cart nobody can get back

## Problem Description

Tuesday's nightly failed in `tests/pricing.test.js` with `AssertionError:
expected 9 to be less than 9`. The reporter printed those two numbers and
nothing else - not the cart, not the customer tier, not the line items.

Nobody has seen it since. The suite has run green roughly forty times, on
laptops and on CI, and re-running the failed job went green immediately. We
cannot put the suite back into the state that produced that number, so we
cannot say whether the bug is still there or whether the price ranges someone
tightened in the factory last month happen to hide it.

Three suites build their data from `tests/factories/cart.js`, so whatever we do
here applies to the rest of them too.

## Output Specification

1. When a run fails, the report must carry whatever a developer needs to re-run
   the suite over exactly the data that failed, and re-running that way must
   produce that data again.
2. Two runs of the unchanged suite must build the same data - on a laptop and
   on CI, in any order.
3. The data must stay generated and varied. Freezing the fields to constant
   values is not an acceptable way to get repeatability; long names, odd
   addresses and awkward prices are the reason the factory exists.
4. Write down, in one or two lines somewhere a developer will find them, how to
   reproduce a failed run from what the report prints.
5. Do not change `src/pricing.js`, and leave both existing tests asserting what
   they assert today. `npm test` must stay green.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "checkout-pricing",
  "version": "1.4.2",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "@faker-js/faker": "9.3.0",
    "vitest": "2.1.8"
  }
}

=============== FILE: src/pricing.js ===============
export function cartTotalCents(cart) {
  const gross = cart.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  if (cart.customer.tier === 'gold') {
    return gross - Math.round(gross * 0.1);
  }
  return gross;
}

=============== FILE: tests/factories/cart.js ===============
import { faker } from '@faker-js/faker';

export function makeCustomer(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    tier: faker.helpers.arrayElement(['standard', 'gold']),
    ...overrides,
  };
}

export function makeCart(overrides = {}) {
  const items = Array.from(
    { length: faker.number.int({ min: 1, max: 4 }) },
    () => ({
      sku: faker.string.alphanumeric(8).toUpperCase(),
      unitPriceCents: faker.number.int({ min: 100, max: 20000 }),
      quantity: faker.number.int({ min: 1, max: 3 }),
    }),
  );

  return {
    id: faker.string.uuid(),
    customer: makeCustomer(),
    items,
    ...overrides,
  };
}

=============== FILE: tests/pricing.test.js ===============
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
