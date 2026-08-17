# Every order in our fixtures belongs to a customer who doesn't exist

## Problem Description

`makeOrder()` generates its own `userId`, so no generated order has ever
belonged to a generated user. `customerOrderReport` skips orders whose user it
cannot find, which means every report row our tests produce says zero orders and
zero revenue - and the tests pass, because they only check the number of rows
and the name on each row.

That caught up with us. A change to the reporting query stopped joining orders
at all. Production reports went out with every customer at $0. The suite was
green through the whole thing.

Two more things make the factory unusable for the ageing report we are about to
write: `totalCents` is generated independently of the line items, so it never
matches the sum of them, and `shippedAt` is generated in the same window as
`placedAt`, so roughly half of our orders ship before they are placed.

## Output Specification

1. A generated order must belong to a real user: the factory either creates the
   user alongside the order or accepts one, and the order's `userId` is that
   user's id. Callers must still be able to pass their own user.
2. Generated records must be internally consistent: an order's total equals the
   sum of its line items, and an order that has shipped shipped after it was
   placed.
3. Add a test that proves the linkage over a batch - every order in a generated
   set points at a user in that set.
4. The report tests must be able to fail: after the change, a report built from
   generated users and orders must show real counts and totals, and the suite
   must go red if the join is dropped again.
5. Two runs must produce the same data.
6. Do not edit `src/report.js`. `npm test` must stay green.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "revenue-reporting",
  "version": "4.7.1",
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

=============== FILE: src/report.js ===============
export function customerOrderReport(users, orders) {
  const byUser = new Map(
    users.map((user) => [
      user.id,
      { userId: user.id, name: user.name, orderCount: 0, totalCents: 0 },
    ]),
  );

  for (const order of orders) {
    const row = byUser.get(order.userId);
    if (!row) continue;
    row.orderCount += 1;
    row.totalCents += order.totalCents;
  }

  return [...byUser.values()];
}

=============== FILE: tests/factories.js ===============
import { faker } from '@faker-js/faker';

export function makeUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    createdAt: faker.date.past({ years: 3 }),
    ...overrides,
  };
}

export function makeOrder(overrides = {}) {
  const items = Array.from(
    { length: faker.number.int({ min: 1, max: 3 }) },
    () => ({
      sku: faker.string.alphanumeric(8).toUpperCase(),
      unitPriceCents: faker.number.int({ min: 500, max: 9000 }),
      quantity: faker.number.int({ min: 1, max: 4 }),
    }),
  );

  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    items,
    totalCents: faker.number.int({ min: 500, max: 40000 }),
    placedAt: faker.date.past({ years: 3 }),
    shippedAt: faker.date.past({ years: 3 }),
    ...overrides,
  };
}

=============== FILE: tests/report.test.js ===============
import { expect, test } from 'vitest';
import { customerOrderReport } from '../src/report.js';
import { makeOrder, makeUser } from './factories.js';

test('the report has one row per user', () => {
  const users = [makeUser(), makeUser(), makeUser()];
  const orders = [makeOrder(), makeOrder(), makeOrder(), makeOrder()];

  expect(customerOrderReport(users, orders)).toHaveLength(3);
});

test('a report row carries the user name', () => {
  const user = makeUser();

  const report = customerOrderReport([user], [makeOrder()]);

  expect(report[0].name).toBe(user.name);
});
