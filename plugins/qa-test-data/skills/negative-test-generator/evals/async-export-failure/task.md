# Export failures only show up after the request is over

## Problem Description

`src/exportQueue.js` runs dataset exports. `submitExport` does a cheap check
of the request and hands back an accepted response with a job id; the work
happens later, when a worker calls `runNext`. Almost everything that can go
wrong is invisible at submit time - the dataset may have been deleted, the
requester's grant may have been revoked since they clicked the button, the row
count may be over the ceiling, object storage may be down.

Permanent failures end the job where they are found. A storage outage is
treated as worth retrying, up to a ceiling, and only then becomes a terminal
failure.

Users report "my export just never appeared", and we cannot tell them why,
because nothing in the suite covers a job that fails. The one test we have
submits an export and watches it produce a file.

## Output Specification

1. Add `src/exportQueue.test.js` covering the failure paths, both the ones the
   submit step can see and the ones only the worker can.
2. Every failed job must be pinned to its own terminal record - a change that
   swapped one failure reason for another, produced a file anyway, or retried
   a permanent failure must fail the suite.
3. Do not modify `src/exportQueue.js`; its current behaviour is the
   specification.
4. Leave `src/exportQueue.happy.test.js` in place.
5. Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "dataset-exports",
  "version": "0.9.4",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/exportQueue.js ===============
'use strict';

const FORMATS = ['csv', 'json'];
const MAX_ATTEMPTS = 3;

function createQueue() {
  return { jobs: new Map(), pending: [], artifacts: [], seq: 0 };
}

function submitExport(queue, request) {
  const { datasetId, format, requestedBy } = request || {};

  if (typeof datasetId !== 'string' || datasetId === '') {
    return { status: 400, code: 'DATASET_REQUIRED', jobId: null };
  }
  if (!FORMATS.includes(format)) {
    return { status: 400, code: 'FORMAT_UNSUPPORTED', jobId: null };
  }
  if (typeof requestedBy !== 'string' || requestedBy === '') {
    return { status: 400, code: 'REQUESTER_REQUIRED', jobId: null };
  }

  queue.seq += 1;
  const jobId = `job_${queue.seq}`;
  queue.jobs.set(jobId, {
    id: jobId,
    datasetId,
    format,
    requestedBy,
    state: 'queued',
    errorCode: null,
    attempts: 0,
  });
  queue.pending.push(jobId);
  return { status: 202, code: null, jobId };
}

function fail(job, errorCode) {
  job.state = 'failed';
  job.errorCode = errorCode;
  return job;
}

function runNext(queue, world) {
  const jobId = queue.pending.shift();
  if (jobId === undefined) {
    return null;
  }
  const job = queue.jobs.get(jobId);
  job.attempts += 1;
  job.state = 'running';

  const dataset = world.datasets[job.datasetId];
  if (!dataset) {
    return fail(job, 'DATASET_MISSING');
  }
  const grants = world.permissions[job.requestedBy] || [];
  if (!grants.includes(job.datasetId)) {
    return fail(job, 'PERMISSION_REVOKED');
  }
  if (dataset.rows > world.maxRows) {
    return fail(job, 'DATASET_TOO_LARGE');
  }
  if (world.storageDown) {
    if (job.attempts >= MAX_ATTEMPTS) {
      return fail(job, 'STORAGE_UNAVAILABLE');
    }
    job.state = 'queued';
    queue.pending.push(jobId);
    return job;
  }

  queue.artifacts.push({ jobId, key: `exports/${jobId}.${job.format}` });
  job.state = 'succeeded';
  return job;
}

function drain(queue, world) {
  while (queue.pending.length > 0) {
    runNext(queue, world);
  }
  return queue;
}

module.exports = { createQueue, submitExport, runNext, drain, FORMATS, MAX_ATTEMPTS };

=============== FILE: src/exportQueue.happy.test.js ===============
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
