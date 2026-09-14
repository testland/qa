'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadRun, countViolations, countByRule } = require('./a11y-gate');

test('a run holds one entry per scanned page', () => {
  const run = loadRun('reports/prev-scan.json');
  assert.deepEqual(run.map((p) => p.url), ['/checkout', '/legacy-orders', '/account']);
});

test('counts every node of every violation in a run', () => {
  assert.equal(countViolations(loadRun('reports/prev-scan.json')), 9);
});

test('per-rule counts add up to the run total', () => {
  const byRule = countByRule(loadRun('reports/pr-4471-scan.json'));
  assert.equal(Object.values(byRule).reduce((a, b) => a + b, 0), 9);
});
