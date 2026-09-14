'use strict';

const { db } = require('./db');
const erasureLog = require('./erasureLog');

function eraseSubject(email, at = '2026-06-01T00:00:00Z') {
  db.users = db.users.filter((u) => u.email !== email);
  db.billingRecords = db.billingRecords.filter((r) => r.userEmail !== email);
  db.supportTickets = db.supportTickets.filter((t) => t.requesterEmail !== email);
  erasureLog.record(email, at);
  return { status: 'erased', subject: email, at };
}

module.exports = { eraseSubject };
