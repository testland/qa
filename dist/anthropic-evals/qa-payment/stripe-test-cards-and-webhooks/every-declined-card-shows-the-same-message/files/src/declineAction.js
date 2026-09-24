'use strict';

const GENERIC = {
  message: 'Your card was declined. Contact your bank for more information.',
  retryable: true,
  notifyRisk: false,
};

const ACTIONS = {
  generic_decline: GENERIC,
  insufficient_funds: {
    message: 'Your card has insufficient funds. Try another card or add funds and retry.',
    retryable: true,
    notifyRisk: false,
  },
  card_velocity_exceeded: {
    message: 'Your card has reached its limit. Try another card.',
    retryable: false,
    notifyRisk: false,
  },
};

// `error` is the card_error the payment API raises on a failed confirm.
function declineAction(error) {
  return ACTIONS[error.decline_code] || GENERIC;
}

module.exports = { declineAction, GENERIC };
