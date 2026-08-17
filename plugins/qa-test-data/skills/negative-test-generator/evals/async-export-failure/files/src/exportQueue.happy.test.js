'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createQueue, submitExport, drain } = require('./exportQueue');

const world = () => ({
  datasets: { ds_small: { rows: 10 } },
  permissions: { u_1: ['ds_small'] },
  maxRows: 1000,
  storageDown: false,
});

test('an accepted export runs to an artifact', () => {
  const queue = createQueue();
  const accepted = submitExport(queue, { datasetId: 'ds_small', format: 'csv', requestedBy: 'u_1' });
  assert.equal(accepted.status, 202);

  drain(queue, world());
  assert.equal(queue.jobs.get(accepted.jobId).state, 'succeeded');
  assert.equal(queue.artifacts.length, 1);
});
