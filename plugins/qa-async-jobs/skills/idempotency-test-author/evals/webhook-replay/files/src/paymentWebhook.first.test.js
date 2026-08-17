'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler, createMemoryStore, createLedger } = require('./paymentWebhook');

test('applies a payment event', async () => {
  const ledger = createLedger();
  const handle = createHandler({ store: createMemoryStore(), ledger });

  const response = await handle({
    idempotencyKey: 'evt_1',
    accountId: 'acc_1',
    amountCents: 2500,
    currency: 'EUR',
  });

  assert.equal(response.status, 'applied');
  assert.equal(ledger.balanceOf('acc_1'), 2500);
});
