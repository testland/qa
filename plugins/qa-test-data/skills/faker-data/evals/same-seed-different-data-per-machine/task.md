# Seed 1337 gives everyone different data

## Problem Description

Every suite starts from seed 1337, set in `tests/setup.js`, and we thought that
made the data identical everywhere. It does not.

CI failed on Friday on a customer whose name overflowed the digest layout. The
job log names the customer: `Mireille Bergstrom`. Ana added a temporary log line
and ran the same suite locally with the same seed and got `Katelin Kunze`.
Priya, on the same commit, got a third name. Ana's `node_modules` is from June,
Priya installed hers last week, and CI installs fresh on every run.

So a failing case reported by CI cannot be pulled onto a laptop, which is the
one thing the seed was supposed to buy us.

## Output Specification

1. Seed 1337 must produce the same data on every developer machine and on CI -
   today, and after any teammate deletes `node_modules` and installs again.
2. Keep the seed value at 1337 and keep the data generated. Do not respond by
   removing or randomizing the seed.
3. CI must install exactly what a developer has.
4. Record, in the repo, what the team has to do the day it deliberately upgrades
   the generator - the values will legitimately change then and people need to
   know that is expected and how to handle it.
5. `npm test` must stay green and the existing assertions must keep asserting
   what they assert today.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "digest-mailer",
  "version": "5.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "@faker-js/faker": "^9.0.0",
    "vitest": "^2.0.0"
  }
}

=============== FILE: .gitignore ===============
node_modules/
coverage/
package-lock.json

=============== FILE: .github/workflows/test.yml ===============
name: test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm test

=============== FILE: vitest.config.js ===============
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.js'],
  },
});

=============== FILE: tests/setup.js ===============
import { faker } from '@faker-js/faker';

faker.seed(1337);

=============== FILE: src/digest.js ===============
export function renderDigest(customer) {
  return `Hi ${customer.name}, you have ${customer.unread} unread messages.`;
}

=============== FILE: tests/digest.test.js ===============
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
