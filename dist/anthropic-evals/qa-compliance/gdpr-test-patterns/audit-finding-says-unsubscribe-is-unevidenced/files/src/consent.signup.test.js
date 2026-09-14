'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const consent = require('./consent');

const AT = '2026-04-02T10:00:00Z';
const YES = 'ilse.mertens@example.net';
const NO = 'ravi.menon@example.net';

test('consent is recorded at collection time', () => {
  consent.reset();
  consent.signup({ email: YES, displayName: 'I. Mertens', consentMarketing: true, at: AT });
  const record = consent.consentFor(YES, 'marketing');
  assert.equal(record.granted, true);
  assert.equal(record.grantedAt, AT);
  assert.equal(record.grantedVia, 'signup-form');
});

test('an unchecked box records no grant', () => {
  consent.reset();
  consent.signup({ email: NO, displayName: 'R. Menon', consentMarketing: false, at: AT });
  const record = consent.consentFor(NO, 'marketing');
  assert.equal(record.granted, false);
  assert.equal(record.grantedAt, null);
});

test('the registration is stored against the address', () => {
  consent.reset();
  consent.signup({ email: YES, displayName: 'I. Mertens', consentMarketing: true, at: AT });
  assert.equal(consent.getUser(YES).displayName, 'I. Mertens');
  assert.equal(consent.getUser('nobody@example.net'), null);
});
