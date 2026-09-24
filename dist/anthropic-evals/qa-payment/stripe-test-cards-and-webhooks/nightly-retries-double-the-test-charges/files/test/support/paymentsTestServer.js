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
