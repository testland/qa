'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const signup = require('./signup');
const { riskScore } = require('./fraud');

const payloads = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'user_signup.json'), 'utf8'),
);

test('a registered account can be risk-scored at sign-in', () => {
  signup.reset();
  signup.createAccount(payloads[0]);
  const result = riskScore(payloads[0].email);
  assert.equal(result.status, 'scored');
  assert.equal(typeof result.score, 'number');
});

test('an address with no account cannot be scored', () => {
  signup.reset();
  assert.equal(riskScore('nobody@example.com').status, 'no_account');
});
