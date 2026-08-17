# Archive tests fail about a quarter of the time with three different errors

## Problem Description

`test/archive.test.js` fails roughly one run in four, and never the same
way twice. We have collected these from CI:

```
expected 0 to equal 1
TypeError: Cannot read properties of undefined (reading 'archived')
expected 1 to equal 0
```

The last one is the strange one: it comes from the test that archives
nothing and asserts the archive is empty. Sometimes it sees an order that
another test created.

We have ruled out the obvious environmental suspects. It reproduces on
laptops as often as on CI, and `--test-concurrency=1` changes nothing. Each
of the first two tests keeps failing at about the same rate when it is the
only test selected; the third one only ever fails inside a full run.
Somebody added an `await sleep(5)` in front of one assertion during an
incident last month; it moved the rate down a little and we backed it out.

`src/orderStore.js` is a thin wrapper over our data layer and behaves
correctly in production - the round-trip timings in it stand in for the real
ones.

## Output Specification

1. Fix `test/archive.test.js` so the three tests pass reliably - a hundred
   consecutive `node --test` runs should be green.
2. Do not modify `src/orderStore.js`, and do not change what any test
   asserts.
3. Write `race-diagnosis.md`: what exactly is racing what, why the empty
   archive test can see another test's order, and what to check for in review
   so the next test in this file does not do the same thing.

Run `node --test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "orders-service",
  "version": "5.0.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/orderStore.js ===============
'use strict';

const rows = [];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Write round-trip. Most writes are served by the local buffer; roughly one
// in seven goes the long way round to the primary.
async function archive(order) {
  await wait(Math.random() < 0.15 ? 45 : 2);
  rows.push({ ...order, archived: true });
}

// Read round-trip.
async function listArchived() {
  await wait(25);
  return rows.slice();
}

function reset() {
  rows.length = 0;
}

module.exports = { archive, listArchived, reset };

=============== FILE: test/archive.test.js ===============
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
