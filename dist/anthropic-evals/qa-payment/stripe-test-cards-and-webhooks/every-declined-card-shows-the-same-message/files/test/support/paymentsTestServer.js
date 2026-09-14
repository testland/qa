'use strict';

// Stands in for the payment API. Each entry is the error body it raises for
// that card identifier on a confirm, or null where the payment goes through.
const BEHAVIOUR = {
  pm_card_visa: null,
  pm_card_mastercard: null,
  pm_card_chargeDeclined: {
    code: 'card_declined',
    decline_code: 'generic_decline',
    message: 'Your card was declined.',
  },
  pm_card_chargeDeclinedInsufficientFunds: {
    code: 'card_declined',
    decline_code: 'insufficient_funds',
    message: 'Your card has insufficient funds.',
  },
  pm_card_chargeDeclinedLostCard: {
    code: 'card_declined',
    decline_code: 'lost_card',
    message: 'Your card was declined.',
  },
  pm_card_chargeDeclinedStolenCard: {
    code: 'card_declined',
    decline_code: 'stolen_card',
    message: 'Your card was declined.',
  },
  pm_card_chargeDeclinedExpiredCard: {
    code: 'expired_card',
    message: 'Your card has expired.',
  },
  pm_card_chargeDeclinedIncorrectCvc: {
    code: 'incorrect_cvc',
    message: "Your card's security code is incorrect.",
  },
  pm_card_chargeDeclinedProcessingError: {
    code: 'processing_error',
    message: 'An error occurred while processing your card. Try again in a little while.',
  },
  pm_card_radarBlock: {
    code: 'card_declined',
    decline_code: 'fraudulent',
    message: 'Your card was declined.',
  },
};

function createPaymentsTestServer() {
  let seq = 0;

  return {
    paymentIntents: {
      async create(params) {
        const behaviour = BEHAVIOUR[params.payment_method];
        if (behaviour === undefined) {
          const err = new Error(`No such PaymentMethod: '${params.payment_method}'`);
          err.type = 'invalid_request_error';
          throw err;
        }
        seq += 1;
        if (behaviour) {
          const err = new Error(behaviour.message);
          err.type = 'card_error';
          Object.assign(err, behaviour);
          err.charge = `ch_test_${seq}`;
          throw err;
        }
        return {
          id: `pi_test_${seq}`,
          object: 'payment_intent',
          amount: params.amount,
          currency: params.currency,
          status: 'succeeded',
        };
      },
    },
  };
}

module.exports = { createPaymentsTestServer, BEHAVIOUR };
