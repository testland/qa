'use strict';

const { observeDelivery } = require('./billing');

function createHandler({ store, ledger, meter }) {
  return async function handle(event) {
    observeDelivery(meter, event);

    if (!event.eventId) {
      return { status: 'rejected', code: 'MISSING_EVENT_ID' };
    }

    const seen = await store.get(event.eventId);
    if (seen) {
      return seen;
    }

    const balance = await ledger.credit(event.accountId, event.amountCents);
    const response = { status: 'applied', balance };
    await store.setIfAbsent(event.eventId, response);
    return response;
  };
}

module.exports = { createHandler };
