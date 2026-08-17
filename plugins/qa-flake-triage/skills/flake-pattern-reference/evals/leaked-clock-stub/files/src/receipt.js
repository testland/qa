'use strict';

const clock = require('./clock');

function issueReceipt(order) {
  return {
    id: `rcpt-${order.id}`,
    issuedAt: new Date(clock.now()).toISOString(),
  };
}

module.exports = { issueReceipt };
