import { faker } from '@faker-js/faker';

export function makeItem(overrides = {}) {
  return {
    sku: faker.string.alphanumeric(8).toUpperCase(),
    name: faker.commerce.productName(),
    stock: faker.number.int({ min: 1, max: 20 }),
    priceCents: faker.number.int({ min: 100, max: 50000 }),
    ...overrides,
  };
}
