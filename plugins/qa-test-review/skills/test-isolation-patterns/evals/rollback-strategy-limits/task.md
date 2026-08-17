# Half the suite started misbehaving after we wrapped every test in a transaction

## Problem Description

Last sprint we made every test in the integration suite run inside a
transaction that is rolled back when the test ends, so tests would stop
leaving rows behind. The wrapper is `tests/support/withRollback.js` and every
integration file uses it. The store is MySQL 8.

Since then four of the files have been trouble. One of them fails outright.
One of them only passes because someone added a `COMMIT` in the middle of it.
Two of them pass on their own but leave something behind that the next file
trips over. `tests/accounts.test.js` has been fine throughout.

Adding `COMMIT` calls is spreading, and it defeats the point of the wrapper.
We want to know, file by file, whether the wrapper is actually doing anything
for that file, and what to do where it is not.

## Output Specification

Produce `rollback-review.md` containing:

1. For each test file below, whether the wrapper actually undoes what that
   test did. Where it does not, say exactly what survives the rollback or is
   invisible inside it, and why.
2. The replacement mechanism for each file that the wrapper does not cover -
   named specifically enough that whoever picks up the ticket does not have to
   make a second decision.
3. Which file needs no change at all.
4. The rule a test author can apply to a new test to decide, before writing
   it, whether the wrapper is enough.

Do not modify any file. This is the review the team will work from.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/support/withRollback.js ===============
'use strict';

const { test } = require('node:test');
const { db } = require('../../src/db');

function withRollback(name, fn) {
  test(name, async (t) => {
    await db.query('BEGIN');
    try {
      await fn(t);
    } finally {
      await db.query('ROLLBACK');
    }
  });
}

module.exports = { withRollback };

=============== FILE: tests/accounts.test.js ===============
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

=============== FILE: tests/schema.test.js ===============
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

=============== FILE: src/reporting.js ===============
'use strict';

const { createPool } = require('./pool');

const reportingPool = createPool({ max: 4 });

async function dailySummary(day) {
  const conn = await reportingPool.acquire();
  try {
    const rows = await conn.query('SELECT SUM(cents) AS cents FROM invoices WHERE day = ?', [day]);
    return { cents: rows[0].cents || 0 };
  } finally {
    conn.release();
  }
}

module.exports = { dailySummary };

=============== FILE: tests/reporting.test.js ===============
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

=============== FILE: tests/notifications.test.js ===============
'use strict';

const assert = require('node:assert/strict');
const { withRollback } = require('./support/withRollback');
const { queue, cache } = require('../src/infra');
const signup = require('../src/signup');

withRollback('queues a welcome email on signup', async () => {
  await signup.register('cy@example.test');
  assert.equal(await queue.depth('emails'), 1);
  assert.equal(await cache.get('signup:cy@example.test'), 'pending');
});

=============== FILE: src/checkout.js ===============
'use strict';

const { db } = require('./db');

async function place(order) {
  await db.query('BEGIN');
  await db.query('INSERT INTO orders (sku, status) VALUES (?, ?)', [order.sku, 'placed']);
  await db.query('UPDATE stock SET count = count - 1 WHERE sku = ?', [order.sku]);
  await db.query('COMMIT');
  return db.query('SELECT * FROM orders WHERE sku = ?', [order.sku]);
}

module.exports = { place };

=============== FILE: tests/checkout.test.js ===============
'use strict';

const assert = require('node:assert/strict');
const { withRollback } = require('./support/withRollback');
const checkout = require('../src/checkout');

withRollback('places an order and takes the item out of stock', async () => {
  const rows = await checkout.place({ sku: 'desk' });
  assert.equal(rows[0].status, 'placed');
});
