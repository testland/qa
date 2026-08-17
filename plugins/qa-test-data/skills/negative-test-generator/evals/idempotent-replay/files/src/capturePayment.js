'use strict';

const CURRENCIES = ['usd', 'eur'];
const MAX_CENTS = 1000000;

function createGateway() {
  return { charges: [], keys: new Map(), seq: 0 };
}

function fingerprint({ customerId, amountCents, currency }) {
  return `${customerId}|${amountCents}|${currency}`;
}

function capturePayment(gateway, request) {
  const { idempotencyKey, customerId, amountCents, currency } = request || {};

  if (typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
    return { status: 400, code: 'IDEMPOTENCY_KEY_REQUIRED', chargeId: null, replayed: false };
  }
  if (typeof customerId !== 'string' || customerId === '') {
    return { status: 400, code: 'CUSTOMER_REQUIRED', chargeId: null, replayed: false };
  }
  if (!Number.isInteger(amountCents)) {
    return { status: 400, code: 'AMOUNT_NOT_AN_INTEGER', chargeId: null, replayed: false };
  }
  if (!CURRENCIES.includes(currency)) {
    return { status: 400, code: 'CURRENCY_UNSUPPORTED', chargeId: null, replayed: false };
  }
  if (amountCents <= 0) {
    return { status: 422, code: 'AMOUNT_NOT_POSITIVE', chargeId: null, replayed: false };
  }
  if (amountCents > MAX_CENTS) {
    return { status: 422, code: 'AMOUNT_ABOVE_LIMIT', chargeId: null, replayed: false };
  }

  const seen = gateway.keys.get(idempotencyKey);
  if (seen) {
    if (seen.fingerprint !== fingerprint(request)) {
      return { status: 409, code: 'IDEMPOTENCY_KEY_REUSED', chargeId: null, replayed: false };
    }
    return { status: 200, code: null, chargeId: seen.chargeId, replayed: true };
  }

  gateway.seq += 1;
  const chargeId = `ch_${gateway.seq}`;
  gateway.charges.push({ id: chargeId, customerId, amountCents, currency });
  gateway.keys.set(idempotencyKey, { fingerprint: fingerprint(request), chargeId });
  return { status: 201, code: null, chargeId, replayed: false };
}

module.exports = { createGateway, capturePayment, CURRENCIES, MAX_CENTS };
