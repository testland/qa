'use strict';

const { priceOrder } = require('./pricing');

function createOrderService({ inventory, gateway }) {
  return {
    async place(order) {
      for (const line of order.lines) {
        if (!inventory.reserve(line.sku, line.qty)) {
          return { status: 'rejected', reason: 'OUT_OF_STOCK', sku: line.sku };
        }
      }
      const amountCents = priceOrder(order.lines);
      const charge = await gateway.charge(amountCents, order.token);
      return { status: 'placed', amountCents, chargeId: charge.chargeId };
    },
  };
}

module.exports = { createOrderService };
