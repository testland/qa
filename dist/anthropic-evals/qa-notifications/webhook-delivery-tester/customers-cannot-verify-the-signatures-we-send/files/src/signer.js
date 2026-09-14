'use strict';

const crypto = require('node:crypto');

const SECRET =
  process.env.WEBHOOK_SECRET || 'whsec_bm9ydGh3aW5kLXN0YWdpbmctZW5kcG9pbnQta2V5LTE=';

function signingKey() {
  return Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
}

function newWebhookId() {
  return 'msg_' + crypto.randomBytes(9).toString('base64url');
}

function signPayload(id, timestamp, payload) {
  const signed = id + '.' + timestamp + '.' + payload;
  return crypto.createHmac('sha256', signingKey()).update(signed).digest('base64');
}

function buildRequest(event) {
  const payload = JSON.stringify(event);
  const timestamp = Date.now();
  const id = newWebhookId();

  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': String(Math.floor(timestamp / 1000)),
      'webhook-signature': 'v1,' + signPayload(id, timestamp, payload),
    },
    body: payload,
  };
}

module.exports = { SECRET, signingKey, newWebhookId, signPayload, buildRequest };
