'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createCache } = require('./cache');
const db = require('./db');
const { loadSeatCount } = require('./seatCount');
const { loadMemberList } = require('./memberList');
const { loadInvoiceTotals } = require('./invoiceTotals');

test('a value survives a round trip', () => {
  const cache = createCache();
  cache.set('k', { a: 1 }, 60);
  assert.deepEqual(cache.get('k'), { a: 1 });
});

test('an expired entry is gone', () => {
  let now = 0;
  const cache = createCache(() => now);
  cache.set('k', { a: 1 }, 60);
  now = 60_001;
  assert.equal(cache.get('k'), null);
});

test('del removes an entry', () => {
  const cache = createCache();
  cache.set('k', { a: 1 }, 60);
  cache.del('k');
  assert.equal(cache.get('k'), null);
});

test('the seat count is served from the cache on the second call', () => {
  const cache = createCache();
  const session = db.sessionFor('acme', 1);
  assert.deepEqual(loadSeatCount(cache, session), { used: 214, limit: 250 });
  assert.equal(cache.size(), 1);
  assert.deepEqual(loadSeatCount(cache, session), { used: 214, limit: 250 });
  assert.equal(cache.size(), 1);
});

test('the member list comes back for the organisation that asked', () => {
  const cache = createCache();
  assert.equal(loadMemberList(cache, 'globex').length, 1);
  assert.equal(loadMemberList(cache, 'acme').length, 2);
});

test('invoice totals count the lines in the period', () => {
  const cache = createCache();
  const totals = loadInvoiceTotals(cache, db.sessionFor('acme', 1), '2026-08');
  assert.equal(totals.lines, 2);
  assert.equal(totals.amount, 'GBP 543.00');
});
