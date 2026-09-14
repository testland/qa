'use strict';

const crypto = require('node:crypto');

// Staging tenant secret. Production comes from the vault.
const SECRET = process.env.WEBHOOK_SECRET || 'whsec_c2hhcmVkc2VjcmV0Zm9yc3RhZ2luZ3RlbmFudA==';

function newWebhookId() {
  return 'msg_' + crypto.randomBytes(12).toString('hex');
}

function signPayload(payload, timestamp) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

function buildRequest(event) {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const id = newWebhookId();

  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Webhook-Id': id,
      'X-Webhook-Timestamp': String(timestamp),
      'X-Webhook-Signature': signPayload(payload, timestamp),
    },
    body: payload,
  };
}

module.exports = { SECRET, newWebhookId, signPayload, buildRequest };
