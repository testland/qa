import test from 'node:test';
import assert from 'node:assert/strict';
import { summarise, isGreen } from './report-summary.mjs';

const sample = {
  suites: [
    { specs: [{ status: 'passed' }, { status: 'passed' }, { status: 'failed' }] },
    { specs: [{ status: 'skipped' }] },
  ],
};

test('counts every spec status', () => {
  assert.deepEqual(summarise(sample), { passed: 2, failed: 1, skipped: 1, other: 0 });
});

test('unknown statuses land in other', () => {
  assert.deepEqual(
    summarise({ suites: [{ specs: [{ status: 'timedOut' }] }] }),
    { passed: 0, failed: 0, skipped: 0, other: 1 },
  );
});

test('an empty report is not green', () => {
  assert.equal(isGreen(summarise({ suites: [] })), false);
});

test('passing with no failures is green', () => {
  assert.equal(isGreen({ passed: 3, failed: 0, skipped: 0, other: 0 }), true);
});
