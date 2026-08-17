'use strict';

const assert = require('node:assert/strict');
const { withRollback } = require('./support/withRollback');
const { db } = require('../src/db');

withRollback('archives an account once the column exists', async () => {
  await db.query('INSERT INTO accounts (email) VALUES (?)', ['bo@example.test']);
  await db.query('ALTER TABLE accounts ADD COLUMN archived tinyint(1) DEFAULT 0');
  await db.query('UPDATE accounts SET archived = 1 WHERE email = ?', ['bo@example.test']);
  const rows = await db.query('SELECT archived FROM accounts WHERE email = ?', ['bo@example.test']);
  assert.equal(rows[0].archived, 1);
});
