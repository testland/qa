# Nothing our factory generates gets past the contact API

## Problem Description

`registerContact` requires E.164 (`+` then digits, no separators) because that
is the form the SMS provider accepts. Our factory hands out numbers like
`(551) 526-4392`, so the staging seeder dies on the first contact and the
contact path has no coverage against generated data at all - the only phone
tests we have use three numbers somebody typed by hand.

A branch tried stripping the punctuation, which produced `5515264392` and was
rejected too, then prefixing `+1` to the stripped digits. That got the US seed
run through. We also seed a German region, and those contacts went in as `+1`
numbers with German digits behind them, which the SMS provider accepted and then
failed to deliver.

`isE164` is not up for discussion - it matches what the provider documents.

## Output Specification

1. Generated contacts must satisfy the contact API as they come out of the
   factory. Prove it with a test that builds 500 contacts and registers every
   one of them without a rejection.
2. We seed two regions, US and Germany. Both must produce numbers the API
   accepts, and a German contact's number must be a German number - not a
   German-looking string behind a US country code.
3. Numbers must stay varied. One constant number for every contact is not
   acceptable; the staging data is used to eyeball the contact list.
4. `scripts/seed-staging.js` must get its contacts from the same factory the
   tests use.
5. Two runs must produce the same contacts.
6. Do not edit `src/validation.js`. `npm test` must stay green.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "contact-service",
  "version": "1.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "seed:staging": "node scripts/seed-staging.js 500"
  },
  "devDependencies": {
    "@faker-js/faker": "9.3.0",
    "vitest": "2.1.8"
  }
}

=============== FILE: src/validation.js ===============
export class InvalidPhone extends Error {
  constructor(value) {
    super(`not an E.164 number: ${value}`);
    this.name = 'InvalidPhone';
  }
}

export function isE164(value) {
  return /^\+[1-9]\d{7,14}$/.test(String(value));
}

export function registerContact(store, contact) {
  if (!isE164(contact.phone)) {
    throw new InvalidPhone(contact.phone);
  }
  store.push(contact);
  return contact;
}

=============== FILE: tests/factories/contact.js ===============
import { faker } from '@faker-js/faker';

export function makeContact(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    phone: faker.phone.number(),
    ...overrides,
  };
}

=============== FILE: tests/validation.test.js ===============
import { expect, test } from 'vitest';
import { InvalidPhone, isE164, registerContact } from '../src/validation.js';

test('an E.164 number is accepted', () => {
  expect(isE164('+14155550123')).toBe(true);
});

test('a nationally formatted number is rejected', () => {
  expect(isE164('(415) 555-0123')).toBe(false);
});

test('registering a contact with a bad number throws', () => {
  expect(() => registerContact([], { phone: '415-555-0123' })).toThrow(
    InvalidPhone,
  );
});

=============== FILE: scripts/seed-staging.js ===============
import { registerContact } from '../src/validation.js';
import { makeContact } from '../tests/factories/contact.js';

const store = [];
const count = Number(process.argv[2] ?? 100);

for (let i = 0; i < count; i += 1) {
  registerContact(store, makeContact());
}

console.log(`seeded ${store.length} contacts`);
