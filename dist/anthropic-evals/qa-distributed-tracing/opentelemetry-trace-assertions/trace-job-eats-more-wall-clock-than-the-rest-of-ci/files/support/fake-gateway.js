'use strict';

function fakeGateway(options = {}) {
  return {
    name: 'northbank',
    async charge(amountCents, currency) {
      if (options.decline) {
        return { status: 'declined', reason: options.decline, amountCents, currency };
      }
      return { status: 'captured', orderId: 'ord_7781', amountCents, currency };
    },
    async refund(orderId, amountCents) {
      if (options.refuseRefund) {
        return { ok: false, reason: options.refuseRefund, orderId, amountCents };
      }
      return { ok: true, refundId: 'rf_2210', orderId, amountCents };
    },
  };
}

module.exports = { fakeGateway };
