const DAY = 24 * 60 * 60 * 1000;

function refundFor(order, requestedAfter) {
  if (order.category === 'digital') {
    return { approved: false, reason: 'Digital orders are final' };
  }
  if (requestedAfter <= 30 * DAY) {
    return { approved: true, amount: order.total };
  }
  if (requestedAfter <= 60 * DAY) {
    return { approved: true, amount: Number((order.total * 0.5).toFixed(2)) };
  }
  return { approved: false, reason: 'Outside the refund window' };
}

module.exports = { refundFor, DAY };
