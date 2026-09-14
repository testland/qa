'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { db, seed } = require('./db');
const erasureLog = require('./erasureLog');
const { eraseSubject } = require('./erasure');

const SUBJECT = 'nina.abel@example.net';

function fresh() {
  seed();
  erasureLog.seed();
}

test('the account row is gone', () => {
  fresh();
  eraseSubject(SUBJECT);
  assert.equal(db.users.filter((u) => u.email === SUBJECT).length, 0);
});

test('billing and support rows are gone', () => {
  fresh();
  eraseSubject(SUBJECT);
  assert.equal(db.billingRecords.filter((r) => r.userEmail === SUBJECT).length, 0);
  assert.equal(db.supportTickets.filter((t) => t.requesterEmail === SUBJECT).length, 0);
});

test('the erasure is written to the audit log', () => {
  fresh();
  eraseSubject(SUBJECT);
  assert.ok(erasureLog.find(SUBJECT));
});

test('the other account is untouched', () => {
  fresh();
  eraseSubject(SUBJECT);
  assert.equal(db.users.length, 1);
  assert.equal(db.billingRecords.length, 1);
});
