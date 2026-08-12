# Payment webhook: only the first delivery is tested

## Problem Description

`src/paymentWebhook.js` credits an account when the payment provider posts a
`payment.succeeded` event. The provider redelivers events on any non-2xx
response and occasionally redelivers after a successful one, so the same
event arrives more than once in normal operation.

The handler already implements key-based deduplication. The only test applies
one event once. We have no coverage proving a redelivery is safe, and no
coverage of what happens when a client reuses a key for a different payload.

## Output Specification

Add `src/paymentWebhook.test.js` covering the redelivery behaviour of this
handler, including what it does when the same key arrives with a payload that
does not match the original.

Run `npm test` before you finish; it must pass.

Leave `src/paymentWebhook.first.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-worker",
  "version": "2.7.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/paymentWebhook.js ===============
'use strict';

function fingerprint(event) {
  return JSON.stringify([event.accountId, event.amountCents, event.currency]);
}

function createMemoryStore() {
  const entries = new Map();
  return {
    async get(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    async setIfAbsent(key, value) {
      if (entries.has(key)) {
        return false;
      }
      entries.set(key, value);
      return true;
    },
    size() {
      return entries.size;
    },
  };
}

function createLedger() {
  const balances = new Map();
  const applied = [];
  return {
    async credit(accountId, amountCents) {
      const next = (balances.get(accountId) || 0) + amountCents;
      balances.set(accountId, next);
      applied.push({ accountId, amountCents });
      return next;
    },
    balanceOf(accountId) {
      return balances.get(accountId) || 0;
    },
    appliedCount() {
      return applied.length;
    },
  };
}

function createHandler({ store, ledger }) {
  return async function handle(event) {
    const key = event.idempotencyKey;
    if (!key) {
      return { status: 'rejected', code: 'MISSING_KEY' };
    }

    const existing = await store.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint(event)) {
        return { status: 'rejected', code: 'KEY_REUSED_WITH_DIFFERENT_PAYLOAD' };
      }
      return existing.response;
    }

    const balance = await ledger.credit(event.accountId, event.amountCents);
    const response = { status: 'applied', balance };
    await store.setIfAbsent(key, { fingerprint: fingerprint(event), response });
    return response;
  };
}

module.exports = { createHandler, createMemoryStore, createLedger, fingerprint };

=============== FILE: src/paymentWebhook.first.test.js ===============
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
