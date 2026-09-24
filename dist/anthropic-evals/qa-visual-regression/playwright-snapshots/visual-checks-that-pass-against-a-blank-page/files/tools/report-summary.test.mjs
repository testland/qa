import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, summaryLines } from './report-summary.mjs';

test('a skipped check is not a pass', () => {
  assert.equal(classify({ name: 'a', status: 'skipped' }), 'not run');
});

test('a pass with nothing to compare against is called out', () => {
  assert.equal(classify({ name: 'b', status: 'passed', comparedAgainst: null }), 'no baseline');
});

test('a real pass stays a pass', () => {
  assert.equal(classify({ name: 'c', status: 'passed', comparedAgainst: 'c.png' }), 'passed');
});

test('one line per result', () => {
  const lines = summaryLines([
    { name: 'a', status: 'skipped' },
    { name: 'c', status: 'passed', comparedAgainst: 'c.png' },
  ]);
  assert.deepEqual(lines, ['a: not run', 'c: passed']);
});
