'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const consent = require('./consent');
const { syncPartnerList } = require('./importer');

const NIGHT = '2026-06-01T02:00:00Z';
const KNOWN = 'ilse.mertens@example.net';
const UNKNOWN = 'joop.dekker@example.net';

test('an address not seen before is created from the partner feed', () => {
  consent.reset();
  const rows = syncPartnerList([{ email: UNKNOWN, name: 'J. Dekker', subscribed: true }], NIGHT);
  assert.deepEqual(rows, [{ email: UNKNOWN, action: 'created' }]);
  assert.equal(consent.consentFor(UNKNOWN, 'marketing').grantedVia, 'partner-list');
});

test('an address already on file is updated rather than duplicated', () => {
  consent.reset();
  consent.signup({ email: KNOWN, displayName: 'I. Mertens', consentMarketing: true, at: '2026-04-02T10:00:00Z' });
  const rows = syncPartnerList([{ email: KNOWN, name: 'I. Mertens', subscribed: true }], NIGHT);
  assert.deepEqual(rows, [{ email: KNOWN, action: 'updated' }]);
  assert.equal(consent.getUser(KNOWN).marketingOptIn, true);
});
