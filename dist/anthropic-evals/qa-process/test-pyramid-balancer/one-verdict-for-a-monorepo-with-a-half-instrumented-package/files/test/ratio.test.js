import test from 'node:test';
import assert from 'node:assert/strict';
import { pct, totalCases } from '../lib/ratio.js';

test('pct is a percentage to one decimal place', () => {
  assert.equal(pct(240, 323), 74.3);
});

test('pct returns null rather than dividing by zero', () => {
  assert.equal(pct(1, 0), null);
});

test('pct returns null for a non-numeric part', () => {
  assert.equal(pct(null, 323), null);
});

test('totalCases sums the layers', () => {
  assert.equal(totalCases({ unit: { cases: 240 }, integration: { cases: 22 }, e2e: { cases: 61 } }), 323);
});
