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
