'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createApp } = require('../src/app');

const SECRET = 'whsec_staging_rotated_2026_09_11';

function signedHeader(payload, secret = SECRET) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

test('a signed delivery is accepted and handed to the handler', async () => {
  const received = [];
  const app = createApp({ secret: SECRET, onEvent: (e) => received.push(e) });
  const payload = JSON.stringify({
    id: 'evt_test_1',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_test_1', amount: 2000, currency: 'eur' } },
  });

  const res = await app.handle({
    method: 'POST',
    url: '/webhooks/stripe',
    headers: { 'stripe-signature': signedHeader(payload) },
    body: payload,
  });

  assert.equal(res.status, 200);
  assert.equal(received.length, 1);
  assert.equal(received[0].type, 'payment_intent.succeeded');
});

test('a delivery signed with the wrong secret is rejected', async () => {
  const received = [];
  const app = createApp({ secret: SECRET, onEvent: (e) => received.push(e) });
  const payload = JSON.stringify({ id: 'evt_test_2', type: 'charge.refunded', data: { object: {} } });

  const res = await app.handle({
    method: 'POST',
    url: '/webhooks/stripe',
    headers: { 'stripe-signature': signedHeader(payload, 'whsec_not_our_secret') },
    body: payload,
  });

  assert.equal(res.status, 400);
  assert.equal(received.length, 0);
});
