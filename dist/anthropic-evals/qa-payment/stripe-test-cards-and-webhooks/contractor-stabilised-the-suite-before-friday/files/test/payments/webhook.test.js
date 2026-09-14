'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleDelivery, processedEvents } = require('../../src/webhookHandler');

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

  handleDelivery(payload, { 'stripe-signature': '' });

  const event = await waitFor(
    () => processedEvents().find((e) => e.id === 'evt_wh_1'),
    { what: 'evt_wh_1 to be processed' },
  );
  assert.equal(event.type, 'payment_intent.succeeded');
});
