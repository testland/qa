import test from 'node:test';
import assert from 'node:assert/strict';
import { rollUpByDay, redRate } from './run-summary.mjs';

const rows = [
  { date: '2026-09-02', failed: 1 },
  { date: '2026-09-02', failed: 0 },
  { date: '2026-09-01', failed: 1 },
];

test('groups runs by day and counts outcomes', () => {
  assert.deepEqual(rollUpByDay(rows), [
    { date: '2026-09-01', red: 1, green: 0 },
    { date: '2026-09-02', red: 1, green: 1 },
  ]);
});

test('red rate is a whole percentage of all runs', () => {
  assert.equal(redRate(rollUpByDay(rows)), 67);
});

test('an empty history has no red rate', () => {
  assert.equal(redRate([]), 0);
});

test('an all-green history reports zero', () => {
  assert.equal(redRate(rollUpByDay([{ date: '2026-09-03', failed: 0 }])), 0);
});
