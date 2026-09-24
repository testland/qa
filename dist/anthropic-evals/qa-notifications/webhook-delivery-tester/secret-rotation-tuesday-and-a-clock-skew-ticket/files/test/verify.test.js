'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { verify, computeSignature, currentSecret } = require('../src/verify.js');

function headersFor(body, { id = 'msg_test', secret = currentSecret(), at = null } = {}) {
  const timestamp = at ?? Math.floor(Date.now() / 1000);
  return {
    'webhook-id': id,
    'webhook-timestamp': String(timestamp),
    'webhook-signature': 'v1,' + computeSignature(secret, id, timestamp, body),
    'content-type': 'application/json',
  };
}

test('a delivery signed with the live secret is accepted', () => {
  const body = '{"type":"payment.captured","data":{"id":"pay_001"}}';
  assert.deepEqual(verify(body, headersFor(body)), { ok: true });
});

test('a delivery signed with an unknown secret is rejected', () => {
  const body = '{"type":"payment.captured","data":{"id":"pay_002"}}';
  const headers = headersFor(body, { secret: 'whsec_bm90LXRoZS1yaWdodC1zZWNyZXQtYXQtYWxsIQ==' });
  assert.equal(verify(body, headers).reason, 'signature_mismatch');
});

test('a body altered after signing is rejected', () => {
  const body = '{"type":"payment.captured","data":{"id":"pay_003","amount":1000}}';
  const headers = headersFor(body);
  const tampered = body.replace('1000', '100000');
  assert.equal(verify(tampered, headers).reason, 'signature_mismatch');
});

test('a delivery timestamped an hour ago is rejected', () => {
  const body = '{"type":"payment.captured","data":{"id":"pay_004"}}';
  const at = Math.floor(Date.now() / 1000) - 3600;
  assert.equal(verify(body, headersFor(body, { at })).reason, 'timestamp_out_of_tolerance');
});
