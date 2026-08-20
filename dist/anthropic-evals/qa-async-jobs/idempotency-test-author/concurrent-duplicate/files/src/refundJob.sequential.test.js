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
