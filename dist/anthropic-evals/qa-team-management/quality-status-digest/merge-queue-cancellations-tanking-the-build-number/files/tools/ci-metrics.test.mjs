import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWindow, passRate, round3 } from './ci-metrics.mjs';

test('pass rate for the current window', () => {
  const rows = loadWindow('ci/runs-2026-09-07-to-2026-09-13.csv');
  assert.equal(round3(passRate(rows)), 0.969);
});

test('pass rate for the prior window', () => {
  const rows = loadWindow('ci/runs-2026-08-31-to-2026-09-06.csv');
  assert.equal(round3(passRate(rows)), 0.915);
});

test('every day in the window is represented', () => {
  assert.equal(loadWindow('ci/runs-2026-09-07-to-2026-09-13.csv').length, 7);
});

test('round3 keeps three places', () => {
  assert.equal(round3(0.8313253012048193), 0.831);
});
