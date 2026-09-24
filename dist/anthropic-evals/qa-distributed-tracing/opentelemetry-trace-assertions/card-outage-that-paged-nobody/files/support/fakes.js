'use strict';

const CAPTURED = { status: 201, body: { charge_id: 'ch_9915' } };
const VOIDED = { status: 200, body: { voided: true } };

function fakeHttp(responses = {}) {
  const calls = [];
  return {
    calls,
    async post(url, body) {
      calls.push({ url, body });
      if (url.endsWith('/v1/voids')) return responses.void || VOIDED;
      return responses.charge || CAPTURED;
    },
  };
}

const sampleOrder = () => ({
  orderId: 'ord_4417',
  amountCents: 4900,
  currency: 'EUR',
  authId: 'auth_311',
});

module.exports = { fakeHttp, sampleOrder };
