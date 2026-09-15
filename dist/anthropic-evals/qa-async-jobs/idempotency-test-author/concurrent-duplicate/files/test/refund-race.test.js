'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRefundHandler } = require('../src/refund-handler');
const { createReservationStore } = require('../src/reservation-store');
const { createGateway } = require('../src/refund-gateway');

// Added on INC-2104: two workers taking the same job must produce one refund.
test('two workers racing the same job issue one refund', async () => {
  const gateway = createGateway();
  const handle = createRefundHandler({ store: createReservationStore(), gateway });
  const job = { jobId: 'job_2', chargeId: 'ch_2', amountCents: 1200 };

  const [a, b] = await Promise.all([await handle(job), await handle(job)]);

  assert.equal(gateway.issuedCount(), 1);
  assert.equal(a.refundId, b.refundId);
});
