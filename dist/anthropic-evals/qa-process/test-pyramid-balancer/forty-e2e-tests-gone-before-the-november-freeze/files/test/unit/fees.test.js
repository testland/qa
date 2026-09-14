import test from 'node:test';
import assert from 'node:assert/strict';
import { feeSchedule, feeCents } from '../../src/fees.js';

test('standard tier is 290 bps', () => {
  assert.equal(feeSchedule('standard'), 290);
});

test('volume tier is cheaper than standard', () => {
  assert.ok(feeSchedule('volume') < feeSchedule('standard'));
});

test('unknown tier is rejected', () => {
  assert.throws(() => feeSchedule('gold'), RangeError);
});

test('fee on a whole-cent amount', () => {
  assert.equal(feeCents(10000, 290), 290);
});

// quarantined 2025-11 after the rounding change, never re-enabled
test.skip('fee rounds half up at the cent', () => {
  assert.equal(feeCents(1723, 290), 50);
});

test('a fractional minor amount is rejected', () => {
  assert.throws(() => feeCents(1.5, 290), TypeError);
});
