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
