'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const consent = require('./consent');
const mailer = require('./mailer');
const campaigns = require('./campaigns');

const AT = '2026-04-02T10:00:00Z';
const A = 'ilse.mertens@example.net';
const B = 'ravi.menon@example.net';

function fresh() {
  consent.reset();
  mailer.reset();
}

test('a campaign returns one row per recipient', () => {
  fresh();
  consent.signup({ email: A, displayName: 'I. Mertens', consentMarketing: true, at: AT });
  consent.signup({ email: B, displayName: 'R. Menon', consentMarketing: true, at: AT });
  const rows = campaigns.runCampaign('Spring release', [A, B]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.result), ['sent', 'sent']);
});

test('a receipt carries the invoice id', () => {
  fresh();
  consent.signup({ email: B, displayName: 'R. Menon', consentMarketing: true, at: AT });
  assert.equal(campaigns.sendReceipt(B, 'INV-2201').status, 'sent');
  assert.equal(mailer.outboxFor(B).at(-1).subject, 'Receipt INV-2201');
});
