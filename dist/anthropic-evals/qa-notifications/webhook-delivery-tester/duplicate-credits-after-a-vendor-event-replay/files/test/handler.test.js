'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { handle, orders, credits, SECRET } = require('../src/handler.js');

let n = 0;

function deliver(event, { deliveryId = null } = {}) {
  const rawBody = JSON.stringify(event);
  const id = deliveryId || 'msg_' + ++n;
  const timestamp = String(Math.floor(Date.now() / 1000));

  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const signed = Buffer.concat([Buffer.from(id + '.' + timestamp + '.'), Buffer.from(rawBody)]);
  const signature = crypto.createHmac('sha256', key).update(signed).digest('base64');

  return handle(rawBody, {
    'webhook-id': id,
    'webhook-timestamp': timestamp,
    'webhook-signature': 'v1,' + signature,
    'content-type': 'application/json',
  });
}

test('an order.created is recorded', () => {
  const res = deliver({
    id: 'evt_a1',
    type: 'order.created',
    data: { id: 'ord_1001', status: 'awaiting_payment', version: 1 },
  });
  assert.equal(res.status, 200);
  assert.equal(orders.get('ord_1001').status, 'awaiting_payment');
});

test('a credit.issued is recorded', () => {
  const res = deliver({
    id: 'evt_b1',
    type: 'credit.issued',
    data: { id: 'ord_2001', amount: 1250, reason: 'late delivery' },
  });
  assert.equal(res.status, 200);
  assert.equal(credits.filter((c) => c.orderId === 'ord_2001').length, 1);
});

test('an unsigned delivery is rejected', () => {
  const res = handle('{"id":"evt_c1","type":"order.created","data":{"id":"ord_3001"}}', {
    'webhook-id': 'msg_unsigned',
    'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
    'webhook-signature': 'v1,3Qm0pWv7XdKzYtR1sLbA8uHcN5eJfG2iO9rTxZyQkUo=',
  });
  assert.equal(res.status, 400);
});

test('an event type we do not handle is acknowledged', () => {
  const res = deliver({
    id: 'evt_d1',
    type: 'shipment.label_printed',
    data: { id: 'ord_4001' },
  });
  assert.equal(res.status, 200);
});
