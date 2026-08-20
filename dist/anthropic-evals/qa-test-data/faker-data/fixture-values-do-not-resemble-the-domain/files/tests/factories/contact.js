import { faker } from '@faker-js/faker';

let counter = 0;

export function makeContact(overrides = {}) {
  counter += 1;
  return {
    id: `contact-${counter}`,
    fullName: faker.lorem.words(2),
    email: `${faker.lorem.word()}@${faker.lorem.word()}.com`,
    phone: faker.string.numeric(10),
    line1: faker.lorem.words(3),
    city: faker.lorem.word(),
    postcode: faker.string.alphanumeric(5),
    dateOfBirth: '1990-01-01',
    accountNumber: faker.string.alphanumeric(12),
    ...overrides,
  };
}
