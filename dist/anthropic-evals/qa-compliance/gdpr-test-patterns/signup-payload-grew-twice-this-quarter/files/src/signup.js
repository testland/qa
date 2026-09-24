'use strict';

const { appendSignupEvent } = require('./audit');

const accounts = [];

function reset() {
  accounts.length = 0;
}

function createAccount(payload) {
  const record = { id: `a_${accounts.length + 1}`, createdAt: '2026-09-01T00:00:00Z' };
  Object.assign(record, payload);
  accounts.push(record);
  appendSignupEvent(payload);
  return record;
}

function accountFor(email) {
  return accounts.find((a) => a.email === email) || null;
}

function storedFields() {
  return [...new Set(accounts.flatMap((a) => Object.keys(a)))];
}

module.exports = { reset, createAccount, accountFor, storedFields };
