'use strict';

function createGateway() {
  const issued = [];
  return {
    async issueRefund(chargeId, amountCents) {
      await new Promise((resolve) => setImmediate(resolve));
      issued.push({ chargeId, amountCents });
      return { refundId: `re_${issued.length}`, amountCents };
    },
    issuedCount() { return issued.length; },
    issued() { return issued.slice(); },
  };
}

module.exports = { createGateway };
