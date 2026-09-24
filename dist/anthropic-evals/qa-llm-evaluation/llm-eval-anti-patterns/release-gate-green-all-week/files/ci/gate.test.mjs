import test from 'node:test';
import assert from 'node:assert/strict';
import { decide } from './gate.mjs';

test('a drop fails the gate', () => {
  assert.equal(decide({ rate: 0.88 }, { rate: 0.91 }).pass, false);
});

test('a rise passes the gate', () => {
  assert.equal(decide({ rate: 0.94 }, { rate: 0.91 }).pass, true);
});

test('an identical rate passes the gate', () => {
  assert.equal(decide({ rate: 0.91 }, { rate: 0.91 }).pass, true);
});

test('the failure reason names both rates', () => {
  assert.match(decide({ rate: 0.8 }, { rate: 0.9 }).reason, /0\.90 -> 0\.80/);
});

test('a tiny drop still fails', () => {
  assert.equal(decide({ rate: 0.9099 }, { rate: 0.91 }).pass, false);
});
