'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const BASE = `http://localhost:${process.env.PORT || 3000}`;

async function events() {
  const res = await fetch(`${BASE}/debug/events`);
  return res.json();
}

async function waitForEvent(type) {
  for (;;) {
    const all = await events();
    const hit = all.find((e) => e.type === type);
    if (hit) return hit;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

test('a succeeded payment reaches the endpoint and verifies', async () => {
  execFileSync('stripe', ['trigger', 'payment_intent.succeeded'], { stdio: 'inherit' });
  const event = await waitForEvent('payment_intent.succeeded');
  assert.equal(event.data.object.object, 'payment_intent');
});

test('a refund reaches the endpoint and verifies', async () => {
  execFileSync('stripe', ['trigger', 'charge.refunded'], { stdio: 'inherit' });
  const event = await waitForEvent('charge.refunded');
  assert.ok(event.data.object.amount_refunded > 0);
});
