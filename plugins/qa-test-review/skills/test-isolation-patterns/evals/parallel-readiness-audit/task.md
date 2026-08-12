# Moving the suite to parallel workers

## Problem Description

Our suite runs on a single worker and takes 14 minutes. We want to move it to
four parallel workers. A trial run produced failures that did not reproduce
when the failing files were run on their own.

Before we spend more time on trial runs, we want the suite read for the
reasons parallel execution breaks it.

## Output Specification

Produce `parallel-readiness.md` containing:

1. Every file below that is unsafe to run alongside another worker, what
   specifically it shares with other workers, and the failure that produces.
2. The fix for each, concrete enough to hand to whoever picks up the ticket.
3. Which files are already safe, so nobody spends time on them.
4. The order to do the work in, if some fixes unblock others.

Do not modify the test files. This is the assessment the team will work from.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/config.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');

test('reads the feature flag from the environment', () => {
  process.env.FEATURE_CHECKOUT_V2 = 'on';
  assert.equal(loadConfig().checkoutV2, true);
});

test('defaults the feature flag to off', () => {
  delete process.env.FEATURE_CHECKOUT_V2;
  assert.equal(loadConfig().checkoutV2, false);
});

=============== FILE: tests/server.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../src/server');

test('serves health on the configured port', async () => {
  const server = await startServer({ port: 3000 });
  const response = await fetch('http://localhost:3000/health');
  assert.equal(response.status, 200);
  await server.close();
});

=============== FILE: tests/logging.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { writeAuditLine } = require('../src/audit');

const LOG_PATH = '/tmp/test.log';

test('appends an audit line', () => {
  fs.writeFileSync(LOG_PATH, '');
  writeAuditLine(LOG_PATH, 'user.login');
  assert.match(fs.readFileSync(LOG_PATH, 'utf8'), /user\.login/);
});

=============== FILE: tests/db.test.js ===============
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

=============== FILE: tests/queue.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { enqueue, drainedCount } = require('../src/queue');

test('drains the queue', async () => {
  enqueue({ id: 1 });
  enqueue({ id: 2 });
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.equal(drainedCount(), 2);
});

=============== FILE: tests/money.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { addMoney, formatMoney } = require('../src/money');

test('adds two amounts in the same currency', () => {
  assert.deepEqual(addMoney({ cents: 100, currency: 'EUR' }, { cents: 250, currency: 'EUR' }), {
    cents: 350,
    currency: 'EUR',
  });
});

test('formats an amount', () => {
  assert.equal(formatMoney({ cents: 350, currency: 'EUR' }), '3.50 EUR');
});
