'use strict';

const crypto = require('node:crypto');

function currentSecret() {
  return process.env.HALCYON_WEBHOOK_SECRET || 'whsec_aGFsY3lvbi1wYXktZW5kcG9pbnQtc2VjcmV0LTQ=';
}

function tolerance() {
  return Number(process.env.WEBHOOK_TOLERANCE_SECONDS || 300);
}

function computeSignature(secret, id, timestamp, rawBody) {
  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const signed = Buffer.concat([
    Buffer.from(id + '.' + timestamp + '.'),
    Buffer.from(rawBody),
  ]);
  return crypto.createHmac('sha256', key).update(signed).digest('base64');
}

function equal(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function verify(rawBody, headers) {
  const id = headers['webhook-id'];
  const timestamp = Number(headers['webhook-timestamp']);
  const sigHeader = headers['webhook-signature'];

  if (!id || !Number.isFinite(timestamp) || !sigHeader) {
    return { ok: false, reason: 'missing_headers' };
  }

  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > tolerance()) {
    return { ok: false, reason: 'timestamp_out_of_tolerance' };
  }

  const provided = sigHeader.startsWith('v1,') ? sigHeader.slice(3) : '';
  const expected = computeSignature(currentSecret(), id, timestamp, rawBody);

  if (!equal(provided, expected)) {
    return { ok: false, reason: 'signature_mismatch' };
  }

  return { ok: true };
}

module.exports = { verify, computeSignature, currentSecret, tolerance };
