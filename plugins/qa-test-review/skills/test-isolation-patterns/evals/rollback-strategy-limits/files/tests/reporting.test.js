'use strict';

const assert = require('node:assert/strict');
const { withRollback } = require('./support/withRollback');
const { db } = require('../src/db');
const { dailySummary } = require('../src/reporting');

withRollback('totals the invoices raised on a day', async () => {
  await db.query('INSERT INTO invoices (cents, day) VALUES (?, ?)', [500, '2026-01-04']);
  await db.query('INSERT INTO invoices (cents, day) VALUES (?, ?)', [250, '2026-01-04']);
  await db.query('COMMIT');
  const summary = await dailySummary('2026-01-04');
  assert.equal(summary.cents, 750);
});
