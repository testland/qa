'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { verify, STAGING_SECRET } = require('../src/verify.js');

function sign(id, timestamp, body, secret = STAGING_SECRET) {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signed = Buffer.concat([Buffer.from(id + '.' + timestamp + '.'), Buffer.from(body)]);
  return 'v1,' + crypto.createHmac('sha256', key).update(signed).digest('base64');
}

function headersFor(id, timestamp, body) {
  return {
    'svix-id': id,
    'svix-timestamp': String(timestamp),
    'svix-signature': sign(id, timestamp, body),
  };
}

test('a correctly signed delivery is accepted', () => {
  const body = '{"id":"evt_ok","type":"charge.succeeded"}';
  const now = Math.floor(Date.now() / 1000);
  assert.deepEqual(verify(body, headersFor('msg_ok', now, body)), { ok: true });
});

test('a wrong signature is rejected', () => {
  const body = '{"id":"evt_bad","type":"charge.succeeded"}';
  const now = Math.floor(Date.now() / 1000);
  const headers = headersFor('msg_bad', now, body);
  headers['svix-signature'] = 'v1,SEbCjXmgWOEcKWYkDaTBPQFlEpDrPCswAVzHGmRZKXo=';
  assert.equal(verify(body, headers).ok, false);
});

test('a delivery signed ten minutes ago is rejected', () => {
  const body = '{"id":"evt_old","type":"charge.succeeded"}';
  const stale = Math.floor(Date.now() / 1000) - 600;
  assert.equal(verify(body, headersFor('msg_old', stale, body)).reason, 'timestamp_out_of_tolerance');
});

test('a delivery with no signature header is rejected', () => {
  const body = '{"id":"evt_none","type":"charge.succeeded"}';
  const now = Math.floor(Date.now() / 1000);
  const headers = headersFor('msg_none', now, body);
  delete headers['svix-signature'];
  assert.equal(verify(body, headers).reason, 'missing_headers');
});
