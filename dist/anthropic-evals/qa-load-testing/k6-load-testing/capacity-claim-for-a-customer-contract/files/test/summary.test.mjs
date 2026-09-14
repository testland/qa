import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { metricValues, thresholdResults, stat } from '../lib/summary.mjs';

const monday = JSON.parse(readFileSync('runs/2026-09-08-summary.json', 'utf8'));

test('reads a metric with its type and values', () => {
  const v = metricValues(monday, 'http_reqs');
  assert.equal(v.type, 'counter');
  assert.equal(v.count, 937760);
});

test('collects every threshold result in the export', () => {
  const results = thresholdResults(monday);
  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.ok));
});

test('returns null for a statistic the export does not carry', () => {
  assert.equal(stat(monday, 'http_req_duration', 'p(99)'), null);
  assert.equal(stat(monday, 'http_req_duration', 'p(95)'), 703);
});
