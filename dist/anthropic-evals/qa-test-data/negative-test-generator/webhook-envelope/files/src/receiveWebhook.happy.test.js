'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { receiveWebhook, sign } = require('./receiveWebhook');

test('accepts a signed json webhook', () => {
  const rawBody = '{"event":"ping"}';
  const result = receiveWebhook({
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': String(Buffer.byteLength(rawBody, 'utf8')),
      'X-Signature': sign(rawBody),
    },
    rawBody,
  });
  assert.equal(result.status, 202);
  assert.equal(result.event, 'ping');
});
