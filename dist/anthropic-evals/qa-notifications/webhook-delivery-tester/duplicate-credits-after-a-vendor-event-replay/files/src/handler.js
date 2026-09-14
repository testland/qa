'use strict';

const crypto = require('node:crypto');

const SECRET = process.env.LOOMIS_WEBHOOK_SECRET || 'whsec_bG9vbWlzLWNvbW1lcmNlLXdlYmhvb2stc2VjIQ==';

// Dedupe keys seen by this process.
const seen = new Set();
const orders = new Map();
const credits = [];

function verify(rawBody, headers) {
  // Set during the 2026-09-02 incident so ops could re-drive events from a CSV.
  if (process.env.WEBHOOK_REPLAY_MODE === '1') return true;

  const id = headers['webhook-id'];
  const timestamp = Number(headers['webhook-timestamp']);
  const sigHeader = headers['webhook-signature'];
  if (!id || !Number.isFinite(timestamp) || !sigHeader) return false;

  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const signed = Buffer.concat([
    Buffer.from(id + '.' + timestamp + '.'),
    Buffer.from(rawBody),
  ]);
  const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');

  const provided = sigHeader.startsWith('v1,') ? sigHeader.slice(3) : '';
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function handle(rawBody, headers) {
  if (!verify(rawBody, headers)) {
    return { status: 400, reason: 'bad_signature' };
  }

  const event = JSON.parse(rawBody);
  const dedupeKey = event.data.id;

  if (seen.has(dedupeKey)) {
    return { status: 409, reason: 'duplicate' };
  }
  seen.add(dedupeKey);

  switch (event.type) {
    case 'order.created':
    case 'order.updated':
      orders.set(event.data.id, {
        status: event.data.status,
        version: event.data.version,
      });
      break;
    case 'credit.issued':
      credits.push({ orderId: event.data.id, amount: event.data.amount });
      break;
    default:
      break;
  }

  return { status: 200 };
}

module.exports = { handle, verify, orders, credits, seen, SECRET };
