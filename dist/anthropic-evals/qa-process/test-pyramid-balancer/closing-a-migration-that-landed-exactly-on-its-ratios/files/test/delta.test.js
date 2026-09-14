import test from 'node:test';
import assert from 'node:assert/strict';
import { delta, attainment, pct } from '../lib/delta.js';

test('delta is after minus before', () => {
  assert.equal(delta(840, 851), 11);
});

test('delta is negative when the layer shrank', () => {
  assert.equal(delta(485, 58), -427);
});

test('attainment is the fraction of the planned change delivered', () => {
  assert.equal(attainment(192, 203), 1.06);
});

test('attainment of a zero plan is one only when nothing moved', () => {
  assert.equal(attainment(0, 0), 1);
  assert.equal(attainment(0, 5), null);
});

test('pct is a percentage to one decimal place', () => {
  assert.equal(pct(851, 1210), 70.3);
});
