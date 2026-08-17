'use strict';

const assert = require('node:assert/strict');
const { withRollback } = require('./support/withRollback');
const { db } = require('../src/db');

withRollback('finds an account by email', async () => {
  await db.query('INSERT INTO accounts (email) VALUES (?)', ['ana@example.test']);
  const rows = await db.query('SELECT id FROM accounts WHERE email = ?', ['ana@example.test']);
  assert.equal(rows.length, 1);
});

withRollback('ignores an unknown email', async () => {
  const rows = await db.query('SELECT id FROM accounts WHERE email = ?', ['nobody@example.test']);
  assert.equal(rows.length, 0);
});
