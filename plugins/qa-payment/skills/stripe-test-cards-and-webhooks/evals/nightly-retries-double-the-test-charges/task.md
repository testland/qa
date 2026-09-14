# The nightly run creates two payments for every order it retries

## Problem Description

Two weeks ago we wrapped the payment tests in a retry, because the sandbox
times out two or three times a week and a red nightly that is red for no reason
gets ignored. `test/support/retry.js` gives a payment test two attempts.

Since then the test-mode dashboard has filled up. Last night: 41 pairs of
payment intents, same customer, same amount, same order metadata, created three
to eight seconds apart. Our finance reconciliation test counts the intents
created in a day against the orders in the fixture set and it now fails about
every other night, which means that test is on its way to being ignored too.

Nobody has lost money because this is all test mode. It is the same code path
that runs in production, where the dunning job also retries, and that one is
not test mode.

I have put last night's export in `docs/duplicate-intents.md`.

Do not change `test/support/retry.js` and do not reduce the number of attempts.
The retry is there for a reason and the sandbox is not getting better. The code
under it has to be able to survive being run twice.

## Output Specification

1. Fix `src/checkout.js` so a second attempt at the same order does not create
   a second payment, and so refunds are safe to attempt twice as well.
2. Add `test/idempotency.test.js` that proves it, including what happens when
   the same key is reused with different parameters.
3. Leave `test/checkout.test.js` and `test/support/` exactly as they are. All
   tests must pass when you are done.
4. Write `docs/idempotency-keys.md`: the key format you settled on, what makes
   it survive a retry, and how far its scope reaches.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "orders-checkout",
  "version": "3.4.1",
  "private": true,
  "scripts": {
    "test": "node --test test/*.test.js"
  }
}

=============== FILE: src/checkout.js ===============
'use strict';

const RETURN_URL = 'https://shop.example.com/orders/return';

// Fresh key per attempt, so a retried attempt is never refused as a duplicate.
function attemptKey(order) {
  return `order-${order.id}-attempt-${order.attempt}`;
}

async function payForOrder(order, payments) {
  return payments.paymentIntents.create(
    {
      amount: order.amountCents,
      currency: order.currency,
      payment_method: order.paymentMethod,
      confirm: true,
      return_url: RETURN_URL,
    },
    { idempotencyKey: attemptKey(order) },
  );
}

async function refundOrder(order, intentId, payments) {
  return payments.refunds.create({
    payment_intent: intentId,
    amount: order.amountCents,
  });
}

module.exports = { payForOrder, refundOrder, RETURN_URL };

=============== FILE: test/support/retry.js ===============
'use strict';

// The sandbox times out a few times a week. Payment tests get two attempts.
function retrying(attempts, body) {
  return async () => {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await body({ attempt });
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  };
}

function makeOrder({ attempt }) {
  return {
    id: 'ord_5501',
    attempt,
    amountCents: 4500,
    currency: 'eur',
    paymentMethod: 'pm_card_visa',
  };
}

module.exports = { retrying, makeOrder };

=============== FILE: test/support/paymentsTestServer.js ===============
'use strict';

// Stands in for the payments API. Mirrors its documented idempotency rules:
// a repeated key with identical parameters replays the first response, and a
// repeated key with different parameters is an error.
function createPaymentsTestServer() {
  const keys = new Map();
  const intents = [];
  const refunds = [];
  let seq = 0;

  function idempotent(key, params, produce) {
    if (!key) return produce();
    const prior = keys.get(key);
    if (prior) {
      if (JSON.stringify(prior.params) !== JSON.stringify(params)) {
        const err = new Error(
          'Keys for idempotent requests can only be used with the same parameters they were first used with.',
        );
        err.type = 'idempotency_error';
        throw err;
      }
      return { ...prior.response, replayed: true };
    }
    const response = produce();
    keys.set(key, { params, response });
    return response;
  }

  return {
    paymentIntents: {
      async create(params, options = {}) {
        return idempotent(options.idempotencyKey, params, () => {
          seq += 1;
          const intent = {
            id: `pi_test_${seq}`,
            object: 'payment_intent',
            amount: params.amount,
            currency: params.currency,
            status: 'succeeded',
            replayed: false,
          };
          intents.push(intent);
          return intent;
        });
      },
    },
    refunds: {
      async create(params, options = {}) {
        return idempotent(options.idempotencyKey, params, () => {
          seq += 1;
          const refund = {
            id: `re_test_${seq}`,
            object: 'refund',
            payment_intent: params.payment_intent,
            amount: params.amount,
            status: 'succeeded',
            replayed: false,
          };
          refunds.push(refund);
          return refund;
        });
      },
    },
    intentsCreated: () => intents.slice(),
    refundsCreated: () => refunds.slice(),
    keysUsed: () => [...keys.keys()],
  };
}

module.exports = { createPaymentsTestServer };

=============== FILE: test/checkout.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { payForOrder, refundOrder } = require('../src/checkout');
const { createPaymentsTestServer } = require('./support/paymentsTestServer');
const { retrying, makeOrder } = require('./support/retry');

test(
  'an order is paid for its full amount',
  retrying(2, async ({ attempt }) => {
    const payments = createPaymentsTestServer();
    const intent = await payForOrder(makeOrder({ attempt }), payments);

    assert.equal(intent.amount, 4500);
    assert.equal(intent.currency, 'eur');
    assert.equal(payments.intentsCreated().length, 1);
  }),
);

test(
  'an order can be refunded in full',
  retrying(2, async ({ attempt }) => {
    const payments = createPaymentsTestServer();
    const order = makeOrder({ attempt });
    const intent = await payForOrder(order, payments);
    const refund = await refundOrder(order, intent.id, payments);

    assert.equal(refund.amount, 4500);
    assert.equal(refund.payment_intent, intent.id);
  }),
);

=============== FILE: docs/duplicate-intents.md ===============
Test-mode payment intents, night of 2026-09-11

41 pairs. One pair reproduced in full below; the other 40 have the same shape.

  pi_3RmT4a2eZvKYlo2C  created 02:14:08  4500 eur  ord_5501  succeeded
    request.idempotency_key = order-ord_5501-attempt-1
  pi_3RmT4h2eZvKYlo2C  created 02:14:13  4500 eur  ord_5501  succeeded
    request.idempotency_key = order-ord_5501-attempt-2

Refund objects from the same night: 78 refunds against 41 intents. None of the
refund requests carried an idempotency key at all.

Reconciliation test `finance/daily-intent-count` for the last fourteen nights:

  fail fail pass fail fail fail pass pass fail fail fail pass fail fail

It compares the count of intents created in the window with the count of orders
in the fixture set, and it started failing the night after the retry wrapper
went in.
