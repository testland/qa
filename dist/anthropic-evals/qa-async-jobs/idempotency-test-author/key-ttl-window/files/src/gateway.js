'use strict';

function createGateway({ store, loseResponses = 0 }) {
  const charged = [];
  let remainingLosses = loseResponses;

  return {
    charge(envelope) {
      if (!envelope.idempotencyKey) {
        return { status: 'rejected', code: 'MISSING_KEY' };
      }
      const accepted = store.putIfAbsent(envelope.idempotencyKey, {
        customerId: envelope.customerId,
        amountCents: envelope.amountCents,
      });
      if (!accepted) {
        return { status: 'duplicate', amountCents: envelope.amountCents };
      }
      charged.push({ customerId: envelope.customerId, amountCents: envelope.amountCents });
      if (remainingLosses > 0) {
        remainingLosses -= 1;
        // The charge stands; only our side lost the answer.
        return { status: 'retryable', reason: 'response_lost' };
      }
      return { status: 'charged', amountCents: envelope.amountCents };
    },

    chargedCount() { return charged.length; },
    totalFor(customerId) {
      return charged
        .filter((c) => c.customerId === customerId)
        .reduce((sum, c) => sum + c.amountCents, 0);
    },
  };
}

module.exports = { createGateway };
