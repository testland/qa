'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRefundHandler } = require('../src/refund-handler');
const { createReservationStore } = require('../src/reservation-store');
const { createGateway } = require('../src/refund-gateway');

test('a job redelivered after it completed is not refunded twice', async () => {
  const gateway = createGateway();
  const handle = createRefundHandler({ store: createReservationStore(), gateway });
  const job = { jobId: 'job_1', chargeId: 'ch_1', amountCents: 500 };

  const first = await handle(job);
  const second = await handle(job);

  assert.equal(gateway.issuedCount(), 1);
  assert.equal(second.refundId, first.refundId);
});
