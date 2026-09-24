'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { handle, verifySignature, shipments, SECRET } = require('../src/parcelo.js');
const fixtures = require('./fixtures/tracking-events.js');

let counter = 0;

function deliveryFor(bodyObject) {
  const rawBody = JSON.stringify(bodyObject);
  const id = 'dlv_test_' + ++counter;
  const timestamp = String(Math.floor(Date.now() / 1000));

  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const signed = id + '.' + timestamp + '.' + JSON.stringify(JSON.parse(rawBody));
  const signature = crypto.createHmac('sha256', key).update(signed).digest('base64');

  return {
    rawBody,
    headers: {
      'parcelo-delivery-id': id,
      'parcelo-timestamp': timestamp,
      'parcelo-signature': 'v1,' + signature,
      'content-type': 'application/json',
    },
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

for (const fixture of fixtures) {
  test('handles ' + fixture.name, async () => {
    const { rawBody, headers } = deliveryFor(fixture.body);
    const res = handle(rawBody, headers);
    assert.equal(res.status, 200);
    await settle();
    assert.equal(shipments.get(fixture.body.shipment_id).state, fixture.expectedState);
  });
}

test('a delivery with a wrong signature is rejected', () => {
  const { rawBody, headers } = deliveryFor(fixtures[0].body);
  headers['parcelo-signature'] = 'v1,7CkrqLXbYPfWTuA1mZs2hN4dEjRvG9oIcQ0KyBx6UlM=';
  assert.equal(handle(rawBody, headers).status, 400);
});

test('a delivery with the body altered after signing is rejected', () => {
  const { rawBody, headers } = deliveryFor(fixtures[0].body);
  const tampered = rawBody.replace('shp_000001', 'shp_999999');
  assert.equal(handle(tampered, headers).status, 400);
});

test('a delivery timestamped an hour ago is rejected', () => {
  const { rawBody, headers } = deliveryFor(fixtures[0].body);
  headers['parcelo-timestamp'] = String(Math.floor(Date.now() / 1000) - 3600);
  assert.equal(handle(rawBody, headers).status, 400);
});

test('signature verification is exercised directly', () => {
  const { rawBody, headers } = deliveryFor(fixtures[2].body);
  assert.equal(verifySignature(rawBody, headers), true);
});

test('an unfamiliar status is accepted without crashing the handler', () => {
  const { rawBody, headers } = deliveryFor({
    shipment_id: 'shp_000003',
    tracking_number: 'PRC0049100003GB',
    status: 'exception',
    event_time: '2026-09-03T10:00:00Z',
  });
  assert.equal(handle(rawBody, headers).status, 200);
});
