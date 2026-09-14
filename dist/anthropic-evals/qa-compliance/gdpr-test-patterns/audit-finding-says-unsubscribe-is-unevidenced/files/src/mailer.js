'use strict';

const { getUser } = require('./consent');

const outbox = [];

function reset() {
  outbox.length = 0;
}

function isEligible(email, type) {
  const user = getUser(email);
  if (!user) return false;
  if (type !== 'marketing') return true;
  return user.marketingOptIn === true;
}

function send(email, type, subject) {
  if (!isEligible(email, type)) return { status: 'suppressed' };
  outbox.push({ email, type, subject });
  return { status: 'sent' };
}

function outboxFor(email) {
  return outbox.filter((m) => m.email === email);
}

module.exports = { reset, isEligible, send, outboxFor };
