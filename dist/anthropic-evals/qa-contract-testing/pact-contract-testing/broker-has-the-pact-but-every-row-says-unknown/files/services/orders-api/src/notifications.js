'use strict';

// GET /notifications?sent=false
function serializeNotification(row) {
  return {
    id: row.id,
    sent: row.sent,
    orderId: row.order_id,
  };
}

function unsentPayload(rows) {
  return rows.filter((r) => !r.sent).map(serializeNotification);
}

module.exports = { serializeNotification, unsentPayload };
