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
