'use strict';

const crypto = require('node:crypto');

const TOLERANCE_SECONDS = 300;

function parseSignatureHeader(header) {
  const out = { timestamp: null, signatures: [] };
  for (const part of String(header || '').split(',')) {
    const [scheme, value] = part.trim().split('=');
    if (scheme === 't') out.timestamp = Number(value);
    if (scheme === 'v1') out.signatures.push(value);
  }
  return out;
}

function verifyStripeSignature(payload, header, secret, nowSeconds) {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const { timestamp, signatures } = parseSignatureHeader(header);
  if (!timestamp || signatures.length === 0) {
    throw new Error('No signatures found matching the expected signature');
  }
  if (Math.abs(now - timestamp) > TOLERANCE_SECONDS) {
    throw new Error('Timestamp outside the tolerance zone');
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');
  const matched = signatures.some(
    (sig) =>
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)),
  );
  if (!matched) {
    throw new Error('No signatures found matching the expected signature');
  }
  return JSON.parse(payload);
}

module.exports = { verifyStripeSignature, TOLERANCE_SECONDS };
