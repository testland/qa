import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate } from '../scripts/perf-gate.mjs';

const soak = JSON.parse(
  readFileSync(new URL('../reports/soak-2026-09-11.json', import.meta.url), 'utf8'),
);

test('last night is inside the budget', () => {
  assert.equal(evaluate(soak).pass, true);
});

test('a slow run is rejected', () => {
  const slow = { metrics: { http_req_duration: { values: { avg: 1500, 'p(95)': 4000 } } } };
  assert.equal(evaluate(slow).pass, false);
});

test('the budget is configurable', () => {
  const run = { metrics: { http_req_duration: { values: { avg: 640, 'p(95)': 2100 } } } };
  assert.equal(evaluate(run, 600).pass, false);
  assert.equal(evaluate(run, 700).pass, true);
});
