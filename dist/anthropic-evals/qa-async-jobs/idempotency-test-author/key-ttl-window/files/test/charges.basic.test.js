'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDedupStore, SEVEN_DAYS_MS } = require('../src/dedup-store');
const { createGateway } = require('../src/gateway');

function build() {
  const clock = { t: 0 };
  const store = createDedupStore({ now: () => clock.t });
  return { clock, gateway: createGateway({ store }), store };
}

test('the same key submitted twice charges once', () => {
  const { gateway } = build();
  const envelope = { idempotencyKey: 'k1', customerId: 'cus_1', amountCents: 500 };

  gateway.charge(envelope);
  const second = gateway.charge(envelope);

  assert.equal(second.status, 'duplicate');
  assert.equal(gateway.chargedCount(), 1);
});

test('a key stops suppressing once the retention window has passed', () => {
  const { clock, gateway } = build();
  const envelope = { idempotencyKey: 'k1', customerId: 'cus_1', amountCents: 500 };

  gateway.charge(envelope);
  clock.t = SEVEN_DAYS_MS;

  assert.equal(gateway.charge(envelope).status, 'charged');
  assert.equal(gateway.chargedCount(), 2);
});
