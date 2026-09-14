'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const signup = require('./signup');
const { enrolSms } = require('./twofactor');

const payloads = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'user_signup.json'), 'utf8'),
);

test('a registered account can enrol in the SMS second factor', () => {
  signup.reset();
  signup.createAccount(payloads[0]);
  const result = enrolSms(payloads[0].email);
  assert.equal(result.status, 'enrolled');
  assert.ok(result.masked.length > 0);
});

test('an address with no account cannot enrol', () => {
  signup.reset();
  assert.equal(enrolSms('nobody@mailhost.example').status, 'no_account');
});
