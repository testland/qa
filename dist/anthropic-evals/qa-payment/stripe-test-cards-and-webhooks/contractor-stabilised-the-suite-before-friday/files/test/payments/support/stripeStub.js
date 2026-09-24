'use strict';

const CARDS = require('../../support/cards');

// Stands in for the client so the decline test does not touch the network.
function stubClient() {
  return {
    paymentIntents: {
      async create(params) {
        const number = params.payment_method_data.card.number;
        if (number === CARDS.DECLINED) {
          const err = new Error('Your card was declined.');
          err.type = 'card_error';
          throw err;
        }
        return { id: 'pi_stub_1', status: 'succeeded', amount: params.amount };
      },
    },
  };
}

module.exports = { stubClient };
