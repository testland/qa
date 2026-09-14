import test from 'node:test';
import assert from 'node:assert/strict';
import { slotsFor, label } from '../src/slots.js';

test('minutes render as a 24-hour label', () => {
  assert.equal(label(17 * 60), '17:00');
  assert.equal(label(21 * 60 + 30), '21:30');
});

test('a two-hour booking stops early enough to finish', () => {
  const slots = slotsFor(120);
  assert.equal(slots[0], '17:00');
  assert.equal(slots.at(-1), '20:00');
});

test('a ninety-minute booking gets one more slot', () => {
  assert.equal(slotsFor(90).at(-1), '20:30');
});

test('a zero duration is rejected', () => {
  assert.throws(() => slotsFor(0), RangeError);
});
