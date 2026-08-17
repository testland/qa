# Import tests fail on the shared CI box but never on a laptop

## Problem Description

`test/importer.test.js` fails about 8% of runs in CI with messages like
`expected 175 to equal 250` and `expected false to equal true`. The counts in
the failure messages are always short of the target, never over it. No
developer has reproduced it locally.

It got noticeably worse two weeks ago when we packed four CI jobs onto each
runner. It is worst on the first job of the morning when the runner is also
pulling images.

The wait in the test was 30ms originally. Someone raised it to 60ms in
March, which took the failure rate from roughly 20% to roughly 8%. There is
an open suggestion to take it to 500ms, and another to mark the file
`--test-retries` in CI.

`src/importer.js` is correct; it is the same code path production uses for
bulk imports.

## Output Specification

1. Fix `test/importer.test.js` so both tests pass regardless of how loaded
   the machine is, including when the import takes ten times longer than it
   does on an idle laptop.
2. Do not modify `src/importer.js`, and keep both tests asserting the same
   final counts they assert today.
3. Write `import-test-notes.md`: why the file is green on a laptop and red on
   a busy runner, what changed to make that stop mattering, and a verdict on
   the two proposals in the PR (the 500ms wait and the retries).

Run `node --test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "catalog-importer",
  "version": "2.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/importer.js ===============
'use strict';

const CHUNK = 25;

// Stands in for the per-row validation and normalisation the real importer
// does before writing a row.
function normalizeSku(sku) {
  let hash = 7;
  for (let i = 0; i < 12000; i += 1) {
    hash = (hash * 31 + sku.charCodeAt(i % sku.length)) % 1000003;
  }
  return hash;
}

// Imports rows in chunks, yielding between chunks so the process stays
// responsive. The returned handle exposes progress, a completion flag, and a
// promise that settles with the final imported count.
function startImport(rows) {
  const state = { imported: 0, done: false };
  let resolveDone;
  const finished = new Promise((resolve) => {
    resolveDone = resolve;
  });

  function step(offset) {
    for (const row of rows.slice(offset, offset + CHUNK)) {
      if (row && row.sku) {
        normalizeSku(row.sku);
        state.imported += 1;
      }
    }
    if (offset + CHUNK >= rows.length) {
      state.done = true;
      resolveDone(state.imported);
      return;
    }
    setImmediate(() => step(offset + CHUNK));
  }

  setImmediate(() => step(0));

  return {
    imported: () => state.imported,
    isDone: () => state.done,
    whenDone: () => finished,
  };
}

module.exports = { startImport };

=============== FILE: test/importer.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startImport } = require('../src/importer');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const makeRows = (n) =>
  Array.from({ length: n }, (_, i) => ({ sku: `SKU-${i}`, qty: 1 }));

test('every row in a small import lands', async () => {
  const job = startImport(makeRows(250));

  await sleep(60);

  assert.equal(job.imported(), 250);
});

test('the job reports itself finished', async () => {
  const job = startImport(makeRows(500));

  await sleep(60);

  assert.equal(job.isDone(), true);
  assert.equal(job.imported(), 500);
});
