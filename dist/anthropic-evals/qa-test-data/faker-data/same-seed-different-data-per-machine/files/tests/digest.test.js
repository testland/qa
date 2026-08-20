import { expect, test } from 'vitest';
import { faker } from '@faker-js/faker';
import { renderDigest } from '../src/digest.js';

function makeCustomer(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    unread: faker.number.int({ min: 1, max: 20 }),
    ...overrides,
  };
}

test('the digest greets the customer by name', () => {
  const customer = makeCustomer();
  expect(renderDigest(customer)).toContain(customer.name);
});

test('the digest reports the unread count', () => {
  const customer = makeCustomer();
  expect(renderDigest(customer)).toContain(String(customer.unread));
});
