# Username rules are under-tested at the length limits

## Problem Description

`src/username.js` enforces a length range and a character whitelist. Signup
has had two bugs at the limits: a 20-character name was rejected once, and a
2-character name was accepted once.

The current test covers a single valid name and one obviously bad one.

## Output Specification

Add `src/username.test.js` giving the length constraint systematic edge
coverage, and cover the character rule separately from the length rule so a
failure tells you which rule broke.

Run `npm test` before you finish; it must pass.

Leave `src/username.smoke.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "accounts",
  "version": "0.8.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/username.js ===============
'use strict';

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const ALLOWED = /^[a-z0-9_]+$/;

function validateUsername(value) {
  if (typeof value !== 'string') {
    return { ok: false, code: 'NOT_STRING' };
  }
  if (value.length < MIN_LENGTH) {
    return { ok: false, code: 'TOO_SHORT' };
  }
  if (value.length > MAX_LENGTH) {
    return { ok: false, code: 'TOO_LONG' };
  }
  if (!ALLOWED.test(value)) {
    return { ok: false, code: 'BAD_CHARS' };
  }
  return { ok: true, code: null };
}

module.exports = { validateUsername, MIN_LENGTH, MAX_LENGTH };

=============== FILE: src/username.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateUsername } = require('./username');

test('accepts a normal username', () => {
  assert.equal(validateUsername('ada_lovelace').ok, true);
});

test('rejects an obviously bad username', () => {
  assert.equal(validateUsername('!!').ok, false);
});
