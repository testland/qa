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
