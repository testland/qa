'use strict';

function serializeCharge(row) {
  return {
    id: row.id,
    amount_cents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    created_at: row.created_at,
  };
}

module.exports = { serializeCharge };
