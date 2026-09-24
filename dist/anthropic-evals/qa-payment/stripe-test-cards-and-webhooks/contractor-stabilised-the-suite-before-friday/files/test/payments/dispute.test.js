'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { disputes, reset } = require('../../src/disputeTracker');

async function waitFor(predicate, { timeoutMs = 20000, intervalMs = 250, what = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const hit = predicate();
    if (hit) return hit;
    if (Date.now() >= deadline) throw new Error(`gave up after ${timeoutMs}ms waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

test('a dispute reaches the tracker and is recorded', async () => {
  reset();
  execFileSync('stripe', ['trigger', 'charge.dispute.created'], { stdio: 'inherit' });

  const dispute = await waitFor(() => disputes().find((d) => d.status === 'needs_response'), {
    what: 'a dispute in needs_response',
  });

  assert.equal(dispute.object, 'dispute');
  assert.ok(dispute.amount > 0);
});
