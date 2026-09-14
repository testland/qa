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
