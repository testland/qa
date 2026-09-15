'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../src/payment-webhook');
const { createEventStore } = require('../src/event-store');
const { createLedger, createMeter } = require('../src/billing');

test('a payment event credits the ledger and meters the usage', async () => {
  const ledger = createLedger();
  const meter = createMeter();
  const handle = createHandler({ store: createEventStore(), ledger, meter });

  const response = await handle({
    eventId: 'evt_1',
    accountId: 'acc_1',
    amountCents: 2500,
    currency: 'EUR',
  });

  assert.equal(response.status, 'applied');
  assert.equal(ledger.balanceOf('acc_1'), 2500);
  assert.equal(meter.billedUsageFor('acc_1'), 2500);
  assert.equal(meter.deliveryCount(), 1);
});
