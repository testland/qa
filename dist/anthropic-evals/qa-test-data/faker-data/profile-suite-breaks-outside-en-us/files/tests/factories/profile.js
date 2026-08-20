import { faker } from '@faker-js/faker';

export function makeProfile(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    postcode: faker.location.zipCode(),
    phone: faker.phone.number(),
    ...overrides,
  };
}
