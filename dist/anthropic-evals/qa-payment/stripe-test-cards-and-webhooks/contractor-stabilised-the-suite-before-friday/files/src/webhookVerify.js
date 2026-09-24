'use strict';

const crypto = require('node:crypto');

const TOLERANCE_SECONDS = 300;

function verifyAndParse(rawBody, signatureHeader, secret) {
  const parts = { t: null, v1: [] };
  for (const piece of String(signatureHeader || '').split(',')) {
    const [scheme, value] = piece.trim().split('=');
    if (scheme === 't') parts.t = Number(value);
    if (scheme === 'v1') parts.v1.push(value);
  }
  if (!parts.t || parts.v1.length === 0) throw new Error('no signature header');
  if (Math.abs(Math.floor(Date.now() / 1000) - parts.t) > TOLERANCE_SECONDS) {
    throw new Error('timestamp outside the tolerance zone');
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.t}.${rawBody}`, 'utf8')
    .digest('hex');
  if (!parts.v1.some((sig) => sig === expected)) throw new Error('signature mismatch');
  return JSON.parse(rawBody);
}

module.exports = { verifyAndParse, TOLERANCE_SECONDS };
