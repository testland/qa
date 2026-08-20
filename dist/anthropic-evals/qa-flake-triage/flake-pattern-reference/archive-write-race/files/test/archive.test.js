'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const store = require('../src/orderStore');

// Keeps the arrange step short in each test.
function seedArchive(order) {
  store.archive(order);
}

beforeEach(() => {
  store.reset();
});

test('an archived order shows up in the archive list', async () => {
  seedArchive({ id: 'ord-1', total: 4200 });

  const rows = await store.listArchived();

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'ord-1');
});

test('archiving flags the order as archived', async () => {
  seedArchive({ id: 'ord-2', total: 900 });

  const rows = await store.listArchived();

  assert.equal(rows[0].archived, true);
});

test('an archive with nothing in it lists nothing', async () => {
  const rows = await store.listArchived();

  assert.equal(rows.length, 0);
});
