'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { db, seedAccount } = require('../src/db');

test('finds an account by email', async (t) => {
  const email = `${t.name.replace(/\s+/g, '-')}@example.test`;
  await seedAccount({ email });
  const found = await db.findAccount(email);
  assert.equal(found.email, email);
});
