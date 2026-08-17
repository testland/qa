import { faker } from '@faker-js/faker';

export function makeContact(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    phone: faker.phone.number(),
    ...overrides,
  };
}
