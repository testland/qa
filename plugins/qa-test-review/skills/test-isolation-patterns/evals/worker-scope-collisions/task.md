# We namespaced everything per worker and still fail one run in twenty

## Problem Description

Three months ago this suite could not run on more than one worker. We fixed
that: nothing binds a fixed port any more, nothing writes to a fixed path,
no test writes to the process environment. Everything goes through
`tests/support/resources.js`, which derives a port, a directory, a database
schema and a queue name from the worker id. Four workers, 11 minutes, and
cross-worker collisions did stop.

What did not stop is a failure on roughly one run in twenty. When we look at
those failures, the two tests involved always turn out to have run in the
same worker, not in different ones. Separately, the first run after a CI job
is killed part-way through almost always fails, and re-running it is green.

Provisioning the schema and running the migrations against it takes about six
seconds, so whatever we do we are not doing that more often than we have to.
Nobody wants to hear "run it on one worker".

## Output Specification

Produce `worker-resource-review.md` containing:

1. For each thing the allocator hands out - the port, the directory, the
   schema, the queue - whether deriving it from the worker id is enough, and
   what specifically goes wrong when it is not.
2. What has to happen between two tests inside a single worker, named per
   resource, and what must stay per worker because repeating it is too
   expensive.
3. What a killed run leaves behind, and what the next run's setup has to do
   about it.
4. What happens when `TEST_WORKER_ID` is absent or when the runner reuses a
   worker id.
5. Anything in the current code that is already right, so nobody redoes it.

Do not modify the files. This is the review the team will work from.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/support/resources.js ===============
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const WORKER_ID = Number(process.env.TEST_WORKER_ID || 0);

const PORT = 30000 + WORKER_ID;
const TMP_DIR = path.join('tmp', `worker-${WORKER_ID}`);
const SCHEMA = `test_worker_${WORKER_ID}`;
const QUEUE = `jobs_worker_${WORKER_ID}`;

let schemaReady = false;

async function ensureSchema(db) {
  if (schemaReady) return SCHEMA;
  await db.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await db.runMigrations(SCHEMA);
  schemaReady = true;
  return SCHEMA;
}

function tmpDir() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  return TMP_DIR;
}

async function releaseAll(db) {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  await db.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
}

module.exports = { WORKER_ID, PORT, TMP_DIR, SCHEMA, QUEUE, ensureSchema, tmpDir, releaseAll };

=============== FILE: tests/global-teardown.js ===============
'use strict';

const { db } = require('../src/db');
const { releaseAll } = require('./support/resources');

module.exports = async () => {
  await releaseAll(db);
};

=============== FILE: tests/uploads.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tmpDir } = require('./support/resources');
const uploads = require('../src/uploads');

test('stores an uploaded file', async () => {
  const dir = tmpDir();
  await uploads.save(path.join(dir, 'invoice.pdf'), Buffer.from('%PDF'));
  assert.equal(fs.readdirSync(dir).length, 1);
});

test('rejects an unsupported type', async () => {
  const dir = tmpDir();
  await assert.rejects(() => uploads.save(path.join(dir, 'notes.exe'), Buffer.from('x')));
  assert.equal(fs.readdirSync(dir).length, 0);
});

=============== FILE: tests/orders.test.js ===============
'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { db } = require('../src/db');
const { queue } = require('../src/infra');
const { ensureSchema, SCHEMA, QUEUE } = require('./support/resources');
const orders = require('../src/orders');

before(async () => {
  await ensureSchema(db);
});

test('records a placed order', async () => {
  await orders.place({ sku: 'desk' });
  const rows = await db.query(`SELECT sku FROM ${SCHEMA}.orders`);
  assert.equal(rows.length, 1);
});

test('queues a fulfilment job', async () => {
  await orders.place({ sku: 'lamp' });
  assert.equal(await queue.depth(QUEUE), 1);
});

=============== FILE: tests/health.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PORT } = require('./support/resources');
const { startServer } = require('../src/server');

test('answers on the health endpoint', async () => {
  const server = await startServer({ port: PORT });
  const response = await fetch(`http://localhost:${PORT}/health`);
  assert.equal(response.status, 200);
  await server.close();
});
