'use strict';

// created_at is epoch milliseconds; the ledger, the audit trail and the admin UI
// all read it that way.
function orderCreated(order) {
  return {
    type: 'order.created',
    created_at: Date.now(),
    data: { id: order.id, total: order.total, currency: order.currency },
  };
}

function orderCancelled(order) {
  return {
    type: 'order.cancelled',
    created_at: Date.now(),
    data: { id: order.id, reason: order.reason },
  };
}

module.exports = { orderCreated, orderCancelled };
