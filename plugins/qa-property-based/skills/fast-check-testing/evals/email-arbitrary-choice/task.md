# Email normalisation needs generated addresses

## Problem Description

`src/emailNormalize.js` normalises an address before we store it: it trims,
lower-cases the domain, and leaves the local part alone because it is
case-sensitive per the RFC.

We want the invariants stated over generated addresses rather than the four
examples currently covered. A previous attempt at this generated random
strings and filtered for ones containing an `@`; it ran slowly, discarded
most of what it produced, and the maintainer removed it.

## Output Specification

Add `src/emailNormalize.property.test.js` stating the invariants of
`normalizeEmail` over generated addresses.

Leave `src/emailNormalize.examples.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "identity",
  "version": "2.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  },
  "devDependencies": {
    "fast-check": "^3.19.0"
  }
}

=============== FILE: src/emailNormalize.js ===============
'use strict';

function normalizeEmail(input) {
  const trimmed = String(input).trim();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) {
    return trimmed;
  }
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  return `${local}@${domain}`;
}

function domainOf(email) {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1);
}

module.exports = { normalizeEmail, domainOf };

=============== FILE: src/emailNormalize.examples.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmail } = require('./emailNormalize');

test('lower-cases the domain', () => {
  assert.equal(normalizeEmail('Ada@Example.COM'), 'Ada@example.com');
});

test('trims surrounding whitespace', () => {
  assert.equal(normalizeEmail('  ada@example.com  '), 'ada@example.com');
});
