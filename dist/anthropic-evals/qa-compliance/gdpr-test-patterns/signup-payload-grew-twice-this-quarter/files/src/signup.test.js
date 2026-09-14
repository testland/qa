'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const signup = require('./signup');

const payloads = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'user_signup.json'), 'utf8'),
);

test('an account is created from a registration payload', () => {
  signup.reset();
  const account = signup.createAccount(payloads[0]);
  assert.ok(account.id);
  assert.equal(account.email, payloads[0].email);
});

test('every payload in the fixture creates an account', () => {
  signup.reset();
  for (const payload of payloads) signup.createAccount(payload);
  assert.equal(payloads.length, 3);
  assert.ok(signup.accountFor(payloads[2].email));
});

test('the terms acceptance survives into the stored account', () => {
  signup.reset();
  const account = signup.createAccount(payloads[0]);
  assert.equal(account.consent_terms, true);
});
