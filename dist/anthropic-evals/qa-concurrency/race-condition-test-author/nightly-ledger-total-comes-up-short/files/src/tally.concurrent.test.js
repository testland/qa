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
