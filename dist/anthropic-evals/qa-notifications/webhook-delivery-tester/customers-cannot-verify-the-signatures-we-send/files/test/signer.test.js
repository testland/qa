'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { signPayload, buildRequest } = require('../src/signer.js');
const { orderCreated } = require('../src/events.js');

test('the signature is stable for the same inputs', () => {
  const a = signPayload('msg_1', 1788859204137, '{"a":1}');
  const b = signPayload('msg_1', 1788859204137, '{"a":1}');
  assert.equal(a, b);
});

test('the signature changes when the payload changes', () => {
  const a = signPayload('msg_1', 1788859204137, '{"a":1}');
  const b = signPayload('msg_1', 1788859204137, '{"a":2}');
  assert.notEqual(a, b);
});

test('the signature changes when the message id changes', () => {
  const a = signPayload('msg_1', 1788859204137, '{"a":1}');
  const b = signPayload('msg_2', 1788859204137, '{"a":1}');
  assert.notEqual(a, b);
});

test('an outbound request carries the three headers in the agreed shape', () => {
  const req = buildRequest(orderCreated({ id: 9071, total: '148.50', currency: 'GBP' }));
  assert.match(req.headers['webhook-id'], /^msg_/);
  assert.match(req.headers['webhook-timestamp'], /^[0-9]{10}$/);
  assert.match(req.headers['webhook-signature'], /^v1,[A-Za-z0-9+/]{43}=$/);
  assert.equal(req.headers['content-type'], 'application/json');
});

test('the body is the serialised event', () => {
  const event = orderCreated({ id: 9071, total: '148.50', currency: 'GBP' });
  const req = buildRequest(event);
  assert.equal(req.body, JSON.stringify(event));
});
