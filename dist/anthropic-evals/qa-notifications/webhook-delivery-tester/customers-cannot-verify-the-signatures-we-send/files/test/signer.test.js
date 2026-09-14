'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { SECRET, signPayload, buildRequest } = require('../src/signer.js');

test('signature is stable for the same payload', () => {
  const a = signPayload('{"a":1}', 1755600000);
  const b = signPayload('{"a":1}', 1755600000);
  assert.equal(a, b);
});

test('signature is an HMAC-SHA256 over the payload', () => {
  const expected = crypto.createHmac('sha256', SECRET).update('{"a":1}').digest('hex');
  assert.equal(signPayload('{"a":1}', 1755600000), expected);
});

test('signature changes when the payload changes', () => {
  const a = signPayload('{"a":1}', 1755600000);
  const b = signPayload('{"a":2}', 1755600000);
  assert.notEqual(a, b);
});

test('outbound request carries id, timestamp and signature headers', () => {
  const req = buildRequest({ type: 'order.created', data: { id: 42 } });
  assert.ok(req.headers['X-Webhook-Id'].startsWith('msg_'));
  assert.match(req.headers['X-Webhook-Timestamp'], /^[0-9]{10}$/);
  assert.equal(req.headers['X-Webhook-Signature'].length, 64);
  assert.equal(req.body, '{"type":"order.created","data":{"id":42}}');
});
