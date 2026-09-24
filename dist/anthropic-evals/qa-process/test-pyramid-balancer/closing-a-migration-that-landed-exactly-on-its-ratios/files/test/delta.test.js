import test from 'node:test';
import assert from 'node:assert/strict';
import { delta, attainment, pct } from '../lib/delta.js';

test('delta is after minus before', () => {
  assert.equal(delta(12, 90), 78);
});

test('delta is negative when the layer shrank', () => {
  assert.equal(delta(143, 19), -124);
});

test('attainment is the fraction of the planned change delivered', () => {
  assert.equal(attainment(78, 5), 0.06);
});

test('attainment of a zero plan is one only when nothing moved', () => {
  assert.equal(attainment(0, 0), 1);
  assert.equal(attainment(0, 5), null);
});

test('pct is a percentage to one decimal place', () => {
  assert.equal(pct(252, 361), 69.8);
});
