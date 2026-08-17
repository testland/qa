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
