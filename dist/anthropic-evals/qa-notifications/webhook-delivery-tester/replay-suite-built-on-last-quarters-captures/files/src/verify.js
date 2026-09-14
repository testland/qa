'use strict';

const crypto = require('node:crypto');

const STAGING_SECRET = 'whsec_cmVwbGF5LWNhcHR1cmUtc3RhZ2luZy1zZWNyZXQtMDE=';

function tolerance() {
  return Number(process.env.WEBHOOK_TOLERANCE_SECONDS || 300);
}

function verify(rawBody, headers, opts = {}) {
  const secret = opts.secret || process.env.WEBHOOK_SECRET || STAGING_SECRET;

  const id = headers['svix-id'];
  const timestamp = Number(headers['svix-timestamp']);
  const sigHeader = headers['svix-signature'];

  if (!id || !Number.isFinite(timestamp) || !sigHeader) {
    return { ok: false, reason: 'missing_headers' };
  }

  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age > tolerance()) {
    return { ok: false, reason: 'timestamp_out_of_tolerance' };
  }

  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const signed = Buffer.concat([
    Buffer.from(id + '.' + timestamp + '.'),
    Buffer.from(rawBody),
  ]);
  const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');

  const provided = sigHeader.startsWith('v1,') ? sigHeader.slice(3) : '';
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'signature_mismatch' };
  }

  return { ok: true };
}

module.exports = { verify, STAGING_SECRET, tolerance };
