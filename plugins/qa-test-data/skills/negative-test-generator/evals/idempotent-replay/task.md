# Retried captures charged some customers twice

## Problem Description

`src/capturePayment.js` is the capture step behind `POST /payments/capture`.
Our mobile client retries any request whose response it never saw, so the same
capture arrives two or three times with the same `Idempotency-Key`.

In March that produced 41 double charges. The handler now records the key with
a fingerprint of the request and replays the stored outcome instead of moving
money again. Support also hit the other side of it: a customer whose first
attempt was refused for a bad amount could not retry under the same key,
because the old code recorded the key before validating.

The suite has one test - a first capture succeeds. Nothing exercises a retry,
so the replay bookkeeping could be deleted without turning the build red.

## Output Specification

1. Add `src/capturePayment.test.js` covering the retry and rejection paths.
2. A change that charged twice for a replay, or that made a refused key
   unusable, must fail the suite.
3. Do not modify `src/capturePayment.js`; its current behaviour is the
   specification.
4. Leave `src/capturePayment.happy.test.js` in place.
5. Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "payments-capture",
  "version": "8.0.2",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/capturePayment.js ===============
'use strict';

const CURRENCIES = ['usd', 'eur'];
const MAX_CENTS = 1000000;

function createGateway() {
  return { charges: [], keys: new Map(), seq: 0 };
}

function fingerprint({ customerId, amountCents, currency }) {
  return `${customerId}|${amountCents}|${currency}`;
}

function capturePayment(gateway, request) {
  const { idempotencyKey, customerId, amountCents, currency } = request || {};

  if (typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
    return { status: 400, code: 'IDEMPOTENCY_KEY_REQUIRED', chargeId: null, replayed: false };
  }
  if (typeof customerId !== 'string' || customerId === '') {
    return { status: 400, code: 'CUSTOMER_REQUIRED', chargeId: null, replayed: false };
  }
  if (!Number.isInteger(amountCents)) {
    return { status: 400, code: 'AMOUNT_NOT_AN_INTEGER', chargeId: null, replayed: false };
  }
  if (!CURRENCIES.includes(currency)) {
    return { status: 400, code: 'CURRENCY_UNSUPPORTED', chargeId: null, replayed: false };
  }
  if (amountCents <= 0) {
    return { status: 422, code: 'AMOUNT_NOT_POSITIVE', chargeId: null, replayed: false };
  }
  if (amountCents > MAX_CENTS) {
    return { status: 422, code: 'AMOUNT_ABOVE_LIMIT', chargeId: null, replayed: false };
  }

  const seen = gateway.keys.get(idempotencyKey);
  if (seen) {
    if (seen.fingerprint !== fingerprint(request)) {
      return { status: 409, code: 'IDEMPOTENCY_KEY_REUSED', chargeId: null, replayed: false };
    }
    return { status: 200, code: null, chargeId: seen.chargeId, replayed: true };
  }

  gateway.seq += 1;
  const chargeId = `ch_${gateway.seq}`;
  gateway.charges.push({ id: chargeId, customerId, amountCents, currency });
  gateway.keys.set(idempotencyKey, { fingerprint: fingerprint(request), chargeId });
  return { status: 201, code: null, chargeId, replayed: false };
}

module.exports = { createGateway, capturePayment, CURRENCIES, MAX_CENTS };

=============== FILE: src/capturePayment.happy.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createGateway, capturePayment } = require('./capturePayment');

test('captures a payment once', () => {
  const gateway = createGateway();
  const result = capturePayment(gateway, {
    idempotencyKey: 'key-1',
    customerId: 'cus_1',
    amountCents: 2500,
    currency: 'usd',
  });
  assert.equal(result.status, 201);
  assert.equal(result.chargeId, 'ch_1');
  assert.equal(gateway.charges.length, 1);
});
