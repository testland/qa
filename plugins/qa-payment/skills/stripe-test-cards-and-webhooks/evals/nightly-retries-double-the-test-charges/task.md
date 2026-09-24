# The nightly run creates two payments for every order it retries

## Problem Description

Two weeks ago we wrapped the payment tests in a retry, because the sandbox times
out two or three times a week and a red nightly that is red for no reason gets
ignored. `test/support/retry.js` gives a payment test two attempts.

Since then the test-mode dashboard has filled up. Last night: 41 pairs of
payment intents, same customer, same amount, same order, created three to eight
seconds apart. Our finance reconciliation test counts the intents created in a
day against the orders in the fixture set and it now fails about every other
night, which means that test is on its way to being ignored too. Last night's
export is in `docs/duplicate-intents.md`.

The awkward part is that somebody already thought about this. The payment call
does send an idempotency key, it is the same key on the second attempt as on the
first, and we are getting two intents anyway. So either we are wrong about what
that key does, or we are doing something that stops it doing it.

Nobody has lost money, because this is all test mode. It is the same code path
that runs in production, where the dunning job also retries, and that one is not
test mode.

Do not change `test/support/retry.js` and do not reduce the number of attempts.
The retry is there for a reason and the sandbox is not getting better. The code
underneath it has to survive being run twice.

## Output Specification

1. Fix `src/checkout.js`.
2. Add `test/idempotency.test.js` that fails against `src/checkout.js` as
   supplied and passes after your change.
3. Leave `test/checkout.test.js` and `test/support/` exactly as they are. All
   tests must pass when you are done.
4. Write `docs/idempotency-keys.md` — the rule whoever adds the next payment
   call should follow.

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

const crypto = require('node:crypto');

const RETURN_URL = 'https://shop.example.com/orders/return';

function orderKey(order) {
  return `order-${order.id}`;
}

function intentParams(order) {
  return {
    amount: order.amountCents,
    currency: order.currency,
    payment_method: order.paymentMethod,
    confirm: true,
    return_url: RETURN_URL,
    metadata: {
      order_id: order.id,
      attempt: String(order.attempt),
    },
  };
}

async function payForOrder(order, payments) {
  const params = intentParams(order);
  try {
    return await payments.paymentIntents.create(params, { idempotencyKey: orderKey(order) });
  } catch (err) {
    if (err.type !== 'idempotency_error') throw err;
    const suffix = crypto.randomBytes(3).toString('hex');
    return payments.paymentIntents.create(params, { idempotencyKey: `${orderKey(order)}-${suffix}` });
  }
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
    request.idempotency_key = order-ord_5501
    metadata = { order_id: "ord_5501", attempt: "1" }
  pi_3RmT4h2eZvKYlo2C  created 02:14:13  4500 eur  ord_5501  succeeded
    request.idempotency_key = order-ord_5501-9c41af
    metadata = { order_id: "ord_5501", attempt: "2" }

The request log for the same window carries 41 errors, one per pair, a few
seconds before the second intent of each pair:

  400 idempotency_error
  Keys for idempotent requests can only be used with the same parameters they
  were first used with. We suggest using a V4 UUID for your idempotency key.

Refund objects from the same night: 78 refunds against 41 intents. None of the
refund requests carried an idempotency key at all.

Reconciliation test `finance/daily-intent-count` for the last fourteen nights:

  fail fail pass fail fail fail pass pass fail fail fail pass fail fail

It compares the count of intents created in the window with the count of orders
in the fixture set, and it started failing the night after the retry wrapper
went in.
