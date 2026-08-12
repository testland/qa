# Duplicate job deliveries arrive at the same moment, not one after another

## Problem Description

`src/refundJob.js` processes refund jobs from a queue with at-least-once
delivery. Two workers can pick up the same job simultaneously - that is the
normal failure mode, not a rare one, and it is the case we have never tested.

The existing test delivers the same job twice, one after the other, and
passes. That proves the dedup store remembers a completed job. It proves
nothing about two workers arriving together, which is the situation that
actually loses money.

## Output Specification

Add `src/refundJob.test.js` covering simultaneous delivery of the same job,
asserting the refund is issued exactly once no matter how many workers race
for it, and that every racing caller receives the same outcome.

Run `npm test` before you finish; it must pass.

Leave `src/refundJob.sequential.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "refunds-worker",
  "version": "1.5.2",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/refundJob.js ===============
'use strict';

function createReservationStore() {
  const entries = new Map();
  return {
    reserve(key) {
      if (entries.has(key)) {
        return { acquired: false };
      }
      let settle;
      const promise = new Promise((resolve) => {
        settle = resolve;
      });
      entries.set(key, { state: 'pending', promise, settle, response: null });
      return { acquired: true };
    },
    complete(key, response) {
      const entry = entries.get(key);
      entry.state = 'done';
      entry.response = response;
      entry.settle(response);
    },
    result(key) {
      const entry = entries.get(key);
      return entry.state === 'done' ? Promise.resolve(entry.response) : entry.promise;
    },
  };
}

function createGateway() {
  const issued = [];
  return {
    async issueRefund(chargeId, amountCents) {
      await new Promise((resolve) => setImmediate(resolve));
      issued.push({ chargeId, amountCents });
      return { refundId: `re_${issued.length}`, amountCents };
    },
    issuedCount() {
      return issued.length;
    },
    issued() {
      return issued.slice();
    },
  };
}

function createRefundJobHandler({ store, gateway }) {
  return async function process(job) {
    const { acquired } = store.reserve(job.jobId);
    if (!acquired) {
      return store.result(job.jobId);
    }
    const refund = await gateway.issueRefund(job.chargeId, job.amountCents);
    const response = { status: 'refunded', refundId: refund.refundId };
    store.complete(job.jobId, response);
    return response;
  };
}

module.exports = { createRefundJobHandler, createReservationStore, createGateway };

=============== FILE: src/refundJob.sequential.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createRefundJobHandler,
  createReservationStore,
  createGateway,
} = require('./refundJob');

test('a redelivered job is not refunded twice', async () => {
  const gateway = createGateway();
  const process = createRefundJobHandler({ store: createReservationStore(), gateway });
  const job = { jobId: 'job_1', chargeId: 'ch_1', amountCents: 500 };

  await process(job);
  await process(job);

  assert.equal(gateway.issuedCount(), 1);
});
