'use strict';

const { all } = require('./sarRequests');
const { isOverdue } = require('./sarDeadline');

function redList(now) {
  return all()
    .filter((r) => isOverdue(r, now))
    .map((r) => ({ id: r.id, subject: r.subject, receivedAt: r.receivedAt }));
}

module.exports = { redList };
