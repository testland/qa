# Reconciliation is a few cents short about one night in six

## Problem Description

Our nightly close reconciles the in-process posting tally against what the
ledger service actually wrote. It has matched to the cent for two years. Since
we moved ingest onto worker threads in July it disagrees roughly one night in
six, always in the same direction — the tally is low. Last Tuesday it was 1,412
postings short out of 3.1 million, on Thursday it was 6 short, and on eleven
other nights it was exactly right.

`src/tally.js` is the accumulator. Each ingest thread gets a handle onto the
same `SharedArrayBuffer` and calls `post()` for every line it parses. There are
four ingest threads in production, eight during catch-up.

There is already a test in the repo that starts two ingest threads against one
tally. It was written after the July migration precisely so this could not
happen, and it has been green on every run since. Two engineers have now looked
at this and both came back with "concurrency is covered, look at the ledger
service". I do not believe them, because the ledger service is not the thing
that changed in July.

What I want out of this is a test that goes red against `tally.js` as it stands
right now and that goes red every single time it is run, not a test that needs
a big enough number of postings and a lucky night. Then fix the accumulator and
show me the same test going green.

## Output Specification

1. Add `src/tally.race.test.js`. It must fail against `createTally` exactly as
   shipped today, and it must fail because the test arranges the collision
   rather than because a particular machine happened to schedule the threads
   that way.
2. Then make it pass. `src/tally.js` may change only inside `post`, `cents`
   and `postings` — the storage stays a `SharedArrayBuffer` shared across
   threads, and ingest stays on worker threads.
3. Repair `src/tally.concurrent.test.js` so that a failure occurring inside an
   ingest thread can actually fail the suite. Keep the file and the test name.
4. Write `docs/lost-update.md`: the numbers you actually observed before the
   change (expected total against observed total, and over how many
   executions), plus why the existing concurrent test never caught this.
5. `npm test` must pass when you are finished. Leave
   `src/tally.basic.test.js` alone.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "ledger-tally",
  "version": "2.4.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/tally.js ===============
'use strict';

const SLOT_CENTS = 0;
const SLOT_POSTINGS = 1;

// Shared accumulator. Every ingest thread holds a handle onto the same
// SharedArrayBuffer and posts into these two slots.
function createTally(sharedBuffer) {
  const view = new Int32Array(sharedBuffer);

  return {
    post(cents) {
      view[SLOT_CENTS] = view[SLOT_CENTS] + cents;
      view[SLOT_POSTINGS] = view[SLOT_POSTINGS] + 1;
    },
    cents() {
      return view[SLOT_CENTS];
    },
    postings() {
      return view[SLOT_POSTINGS];
    },
  };
}

module.exports = { createTally, SLOT_CENTS, SLOT_POSTINGS };

=============== FILE: src/tally.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTally } = require('./tally');

test('accumulates postings on a single thread', () => {
  const tally = createTally(new SharedArrayBuffer(8));

  tally.post(1200);
  tally.post(305);

  assert.equal(tally.cents(), 1505);
  assert.equal(tally.postings(), 2);
});

=============== FILE: src/tally.concurrent.test.js ===============
'use strict';

const test = require('node:test');
const { Worker } = require('node:worker_threads');

const INGEST = `
const assert = require('node:assert/strict');
const { workerData } = require('node:worker_threads');
const { createTally } = require(workerData.modulePath);

const tally = createTally(workerData.buffer);
for (let i = 0; i < workerData.postings; i++) {
  tally.post(workerData.cents);
}
assert.ok(tally.postings() >= workerData.postings, 'this ingest thread posted nothing');
`;

test('two ingest threads share one tally', async () => {
  const buffer = new SharedArrayBuffer(8);
  const modulePath = require.resolve('./tally');
  const finished = [];

  for (let t = 0; t < 2; t++) {
    const worker = new Worker(INGEST, {
      eval: true,
      workerData: { buffer, modulePath, postings: 20000, cents: 1, threads: 2 },
    });
    finished.push(new Promise((resolve) => worker.on('exit', resolve)));
    // give it a moment to spin up before starting the next one
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  await Promise.all(finished);
});

=============== FILE: docs/july-migration.md ===============
# Ingest on worker threads — July 2026

Before: a single ingest loop on the main thread, ~9,000 postings/second,
close finished at 04:40.

After: four `node:worker_threads` ingest threads over one `SharedArrayBuffer`,
~31,000 postings/second, close finishes at 03:05. Eight threads during
catch-up after an outage.

Nothing else in the close path changed. The ledger service was last deployed
in April.

## Reconciliation results since the migration

| Night | Expected postings | Tally reported | Delta |
|---|---|---|---|
| 08-26 | 3,104,882 | 3,104,882 | 0 |
| 08-27 | 2,981,044 | 2,981,044 | 0 |
| 09-01 | 3,220,119 | 3,218,707 | -1,412 |
| 09-02 | 3,190,556 | 3,190,556 | 0 |
| 09-04 | 3,088,901 | 3,088,895 | -6 |
| 09-08 | 3,402,733 | 3,402,733 | 0 |

Deltas are always negative. Catch-up nights (eight threads) are
over-represented among the bad ones.
