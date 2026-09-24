import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRetryCharge, nextAttemptAt, isFinalFailure } from '../../src/billing/dunning.js';

const at = new Date('2026-09-01T00:00:00Z');

test('does not retry an expired card', () => {
  assert.equal(shouldRetryCharge({ code: 'card_expired', attempt: 0 }), false);
});

test('does not retry a suspected fraud decline', () => {
  assert.equal(shouldRetryCharge({ code: 'fraud_suspected', attempt: 0 }), false);
});

test('retries a soft decline until the schedule runs out', () => {
  assert.equal(shouldRetryCharge({ code: 'insufficient_funds', attempt: 0 }), true);
  assert.equal(shouldRetryCharge({ code: 'insufficient_funds', attempt: 2 }), true);
  assert.equal(shouldRetryCharge({ code: 'insufficient_funds', attempt: 3 }), false);
});

test('schedules the first retry one day out', () => {
  const next = nextAttemptAt({ code: 'insufficient_funds', attempt: 0 }, at);
  assert.equal(next.toISOString(), '2026-09-02T00:00:00.000Z');
});

test('schedules the third retry seven days out', () => {
  const next = nextAttemptAt({ code: 'insufficient_funds', attempt: 2 }, at);
  assert.equal(next.toISOString(), '2026-09-08T00:00:00.000Z');
});

test('gives no date once the schedule is exhausted', () => {
  assert.equal(nextAttemptAt({ code: 'insufficient_funds', attempt: 3 }, at), null);
});

test('a first-attempt hard decline is not yet a final failure', () => {
  assert.equal(isFinalFailure({ code: 'card_expired', attempt: 0 }), false);
});

test('a later hard decline is a final failure', () => {
  assert.equal(isFinalFailure({ code: 'card_expired', attempt: 1 }), true);
});
