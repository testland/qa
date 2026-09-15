'use strict';

function createRefundHandler({ store, gateway }) {
  return async function handleRefund(job) {
    const existing = await store.read(job.jobId);
    if (existing) return existing;

    const refund = await gateway.issueRefund(job.chargeId, job.amountCents);
    const response = {
      status: 'refunded',
      refundId: refund.refundId,
      amountCents: refund.amountCents,
    };
    await store.write(job.jobId, response);
    return response;
  };
}

module.exports = { createRefundHandler };
