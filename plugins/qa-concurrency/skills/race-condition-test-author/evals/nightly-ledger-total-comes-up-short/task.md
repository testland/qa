# Reconciliation is a few cents short about one night in six

## Problem Description

Our nightly close reconciles the in-process posting tally against what the
ledger service actually wrote. It matched to the cent for two years. Since we
moved ingest onto worker threads in July it disagrees roughly one night in six,
always in the same direction — the tally is low. Last Tuesday it was 1,412
postings short out of 3.1 million, on Thursday it was 6 short, and on eleven
other nights it was exactly right.

`src/tally.js` is the accumulator. Each ingest thread gets a handle onto the
same `SharedArrayBuffer` and calls `post()` for every line it parses. There are
four ingest threads in production, eight during catch-up.

There is already a test in the repo that starts two ingest threads against one
tally. It was written in July precisely so this could not happen, and it has
been green on every run since. Two engineers have now looked at this and both
came back with "concurrency is covered, look at the ledger service". I do not
believe them, because the ledger service is not the thing that changed in July.

What I want out of this is a test that goes red against `tally.js` as it stands
right now and that goes red every single time it is run on any machine, not a
test that needs a big enough number of postings and a lucky night. Then fix the
accumulator and show me the same test going green.

One thing before you start: the money slot in that buffer is a float64 and it
has to stay wide enough for a real night. We carry 3.1 million postings an
evening and the running total in cents goes past two billion well before dawn,
which is why it was widened in March. Whatever you do to make the accumulator
safe has to still hold that number.

## Output Specification

1. Add `src/tally.race.test.js`. It must fail against `createTally` exactly as
   shipped today, and it must fail because the test arranges the collision
   rather than because a particular machine happened to schedule the threads
   that way.
2. Then make it pass. The storage stays one `SharedArrayBuffer` shared across
   the ingest threads and ingest stays on worker threads.
3. `src/tally.basic.test.js` is not to be edited, and it has to keep passing
   unchanged.
4. `src/tally.concurrent.test.js` keeps its filename and its test name. Say
   whether it is worth keeping and act on your answer.
5. Write `docs/lost-update.md`: the expected total against the observed total
   that you actually saw before the change, over how many executions, and why
   the test written in July stayed green for two months.
6. `npm test` must pass when you are finished.

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

// Byte 0..7 float64 cents (nightly totals run past 2^31), byte 8..11 int32 postings.
const TALLY_BYTES = 16;

function createTally(sharedBuffer) {
  const cents = new Float64Array(sharedBuffer, 0, 1);
  const postings = new Int32Array(sharedBuffer, 8, 1);

  return {
    post(amountCents) {
      cents[0] = cents[0] + amountCents;
      postings[0] = postings[0] + 1;
    },
    cents() {
      return cents[0];
    },
    postings() {
      return postings[0];
    },
  };
}

module.exports = { createTally, TALLY_BYTES };

=============== FILE: src/tally.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTally, TALLY_BYTES } = require('./tally');

test('accumulates postings on a single thread', () => {
  const tally = createTally(new SharedArrayBuffer(TALLY_BYTES));

  tally.post(1200);
  tally.post(305);

  assert.equal(tally.cents(), 1505);
  assert.equal(tally.postings(), 2);
});

test('carries a full night without losing precision', () => {
  const tally = createTally(new SharedArrayBuffer(TALLY_BYTES));

  tally.post(2147483647);
  tally.post(2147483647);

  assert.equal(tally.cents(), 4294967294);
  assert.equal(tally.postings(), 2);
});

=============== FILE: src/tally.concurrent.test.js ===============
'use strict';

const test = require('node:test');
const { Worker } = require('node:worker_threads');
const { TALLY_BYTES } = require('./tally');

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
  const buffer = new SharedArrayBuffer(TALLY_BYTES);
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
in April. The money slot was widened to a float64 in March, before any of this,
because a busy night carries more cents than an int32 holds.

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
