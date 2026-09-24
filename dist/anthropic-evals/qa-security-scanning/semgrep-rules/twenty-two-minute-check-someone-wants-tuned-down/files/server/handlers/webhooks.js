'use strict';

const crypto = require('node:crypto');

const TOLERANCE_SECONDS = 300;

function parseSignatureHeader(header) {
  const out = {};
  for (const part of String(header || '').split(',')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function verifyWebhook(rawBody, header, secret, nowSeconds) {
  const parsed = parseSignatureHeader(header);
  const ts = Number(parsed.t);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'missing timestamp' };
  if (Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) {
    return { ok: false, reason: 'timestamp outside tolerance' };
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(ts + '.' + rawBody)
    .digest('hex');
  const given = Buffer.from(String(parsed.v1 || ''), 'utf8');
  const want = Buffer.from(expected, 'utf8');
  if (given.length !== want.length) return { ok: false, reason: 'signature mismatch' };
  if (!crypto.timingSafeEqual(given, want)) return { ok: false, reason: 'signature mismatch' };
  return { ok: true };
}

module.exports = { verifyWebhook, parseSignatureHeader, TOLERANCE_SECONDS };
