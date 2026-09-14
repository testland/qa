import test from 'node:test';
import assert from 'node:assert/strict';
import { isEligible, scheduledFor, feeCents } from './schedule.js';

const now = new Date('2026-09-01T00:00:00Z');

test('a held payout is not eligible', () => {
  assert.equal(isEligible({ status: 'held', amountCents: 500, attempt: 0 }), false);
});

test('a zero-amount payout is not eligible', () => {
  assert.equal(isEligible({ status: 'ready', amountCents: 0, attempt: 0 }), false);
});

test('a ready payout is eligible inside the window', () => {
  assert.ok(isEligible({ status: 'ready', amountCents: 500, attempt: 0 }));
});

test('schedules the first attempt one day out', () => {
  const at = scheduledFor({ status: 'ready', amountCents: 500, attempt: 0 }, now);
  assert.equal(at.toISOString(), '2026-09-02T00:00:00.000Z');
});

test('gives no date once the window list is exhausted', () => {
  assert.equal(scheduledFor({ status: 'ready', amountCents: 500, attempt: 3 }, now), null);
});

test('fee rounds to the nearest cent', () => {
  assert.equal(feeCents(1999, 0.029), 58);
});
