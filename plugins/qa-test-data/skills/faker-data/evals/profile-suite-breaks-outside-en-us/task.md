# Profile suite can't be pointed at the German or Japanese market

## Problem Description

We ship the profile page in three markets next month: US, Germany and Japan.
The profile suite only knows about the US one. Everything it builds is a US
person at a US address, and two of the assertions have quietly baked that in.

The first attempt at Japanese coverage failed immediately. `initials` splits the
full name on a space, and the Japanese names we tried have no space in them, so
the assertion that a profile has at least two initials failed. Somebody
"fixed" it by leaving the Japanese profiles on US names, which passes and tests
nothing.

The postcode assertion has the same problem in the other direction: German
postcodes are five digits with no extension, Japanese ones carry a hyphen in a
different place, and the current pattern only describes the US format.

## Output Specification

1. The profile factory must be able to build a profile for the US, German and
   Japanese markets, where the name, city, street, postcode and phone number
   are that market's real formats rather than US values with a market label
   attached.
2. Assertions that hold in only one market must not be applied to the others.
   The initials rule and the postcode pattern are the two known cases; check
   for others while you are in there.
3. Each market's postcode and phone assertions must describe that market's
   actual format, and the suite must fail if a market silently comes back with
   US-shaped data.
4. Two runs of the suite must produce the same data.
5. The three existing US tests must keep passing and keep asserting what they
   assert today. Do not edit `src/profile.js`. `npm test` must stay green.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "profile-page",
  "version": "0.9.0",
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

=============== FILE: src/profile.js ===============
export function initials(fullName) {
  return String(fullName)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('');
}

export function formatAddress(profile) {
  return `${profile.street}, ${profile.city} ${profile.postcode}`;
}

=============== FILE: tests/factories/profile.js ===============
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

=============== FILE: tests/profile.test.js ===============
import { expect, test } from 'vitest';
import { formatAddress, initials } from '../src/profile.js';
import { makeProfile } from './factories/profile.js';

test('initials take the first letter of each part of the name', () => {
  const profile = makeProfile();
  expect(initials(profile.name).length).toBeGreaterThanOrEqual(2);
});

test('the postcode is a five digit ZIP, optionally with the plus four', () => {
  const profile = makeProfile();
  expect(profile.postcode).toMatch(/^\d{5}(-\d{4})?$/);
});

test('the formatted address ends with the postcode', () => {
  const profile = makeProfile();
  expect(formatAddress(profile)).toContain(profile.postcode);
});
