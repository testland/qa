'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const signup = require('./signup');
const audit = require('./audit');

const payloads = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'user_signup.json'), 'utf8'),
);

test('creating an account appends one signup entry', () => {
  signup.reset();
  audit.resetAudit();
  signup.createAccount(payloads[0]);
  const entries = audit.auditEntries();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].received.email, payloads[0].email);
});

test('a later signup leaves the earlier entry as it was', () => {
  signup.reset();
  audit.resetAudit();
  signup.createAccount(payloads[0]);
  signup.createAccount(payloads[1]);
  const entries = audit.auditEntries();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].seq, 1);
  assert.equal(entries[0].received.email, payloads[0].email);
});
