'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { handleDelivery, processedEvents } = require('../../src/webhookHandler');

const SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_local';

function header(payload) {
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', SECRET).update(`${t}.${payload}`, 'utf8').digest('hex');
  return `t=${t},v1=${sig}`;
}

async function waitFor(predicate, { timeoutMs = 30000, intervalMs = 250, what = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const hit = predicate();
    if (hit) return hit;
    if (Date.now() >= deadline) throw new Error(`gave up after ${timeoutMs}ms waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

test('a delivered payment_intent.succeeded is processed', async () => {
  const payload = JSON.stringify({
    id: 'evt_wh_1',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_wh_1', amount: 2400 } },
  });

  handleDelivery(payload, { 'stripe-signature': header(payload) }, SECRET);

  const event = await waitFor(() => processedEvents().find((e) => e.id === 'evt_wh_1'), {
    what: 'evt_wh_1 to be processed',
  });
  assert.equal(event.type, 'payment_intent.succeeded');
});
