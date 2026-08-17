# Half of contact.js has no tests because our fixtures can't reach it

## Problem Description

`tests/factories/contact.js` fills every field with filler text: the name is two
random words, the postcode is five random letters and digits, the date of birth
is the same hardcoded string for every contact, and the account number is a
random alphanumeric blob.

The consequence is that `isDeliverable`, `isAdult` and `maskAccountNumber` are
untested. `isDeliverable` wants a postcode that looks like a postcode and our
factory cannot produce one, so the first attempt at a test wrote its own
literal contact inline, which then drifted from the factory and was deleted.
`maskAccountNumber` shipped a bug last quarter (it returned `****` for anything
with fewer than five digits, and half of our fixtures have zero digits, so
nothing caught it).

Separately, in April a customer whose display name contained
`<script>alert(1)</script>` had it rendered raw in an internal back-office tool.
`escapeName` was written for that and never covered.

## Output Specification

1. Rework `tests/factories/contact.js` so each field is produced by a source
   that matches what the field holds: a person's name, an address whose street,
   city and postcode satisfy the app's address rule, a dialable phone number, a
   date of birth that puts the contact in adult range, and an account number in
   a payment-like shape.
2. Add tests for `isDeliverable`, `isAdult` and `maskAccountNumber` that run
   against factory output rather than literals written into each test.
3. Cover the April incident: `escapeName` must be exercised with that exact
   input.
4. Two runs of the suite must produce the same data.
5. Do not edit `src/contact.js`; the two existing tests keep asserting what they
   assert. `npm test` must stay green.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "crm-contacts",
  "version": "3.1.0",
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

=============== FILE: src/contact.js ===============
export function normalizeContact(contact) {
  return {
    ...contact,
    email: contact.email.trim().toLowerCase(),
    phone: contact.phone.replace(/[^\d+]/g, ''),
    postcode: contact.postcode.trim().toUpperCase(),
  };
}

export function isDeliverable(contact) {
  return Boolean(
    contact.line1 &&
      contact.city &&
      /^\d{5}(-\d{4})?$/.test(String(contact.postcode).trim()),
  );
}

export function isAdult(contact, today = new Date()) {
  const dob = new Date(contact.dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const years = (today.getTime() - dob.getTime()) / 31557600000;
  return years >= 18;
}

export function escapeName(name) {
  return String(name)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function maskAccountNumber(accountNumber) {
  const digits = String(accountNumber).replace(/\D/g, '');
  return digits.length <= 4 ? '****' : `****${digits.slice(-4)}`;
}

=============== FILE: tests/factories/contact.js ===============
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

=============== FILE: tests/contact.test.js ===============
import { expect, test } from 'vitest';
import { normalizeContact } from '../src/contact.js';
import { makeContact } from './factories/contact.js';

test('normalizing lowercases and trims the email', () => {
  const contact = makeContact({ email: '  Person@Example.com ' });
  expect(normalizeContact(contact).email).toBe('person@example.com');
});

test('normalizing leaves the id untouched', () => {
  const contact = makeContact();
  expect(normalizeContact(contact).id).toBe(contact.id);
});
