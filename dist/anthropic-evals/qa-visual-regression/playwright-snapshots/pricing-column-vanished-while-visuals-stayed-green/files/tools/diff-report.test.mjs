import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRow, summarize } from './diff-report.mjs';

const ROWS = [
  { name: 'a.png', width: 100, height: 100, diffPixels: 250 },
  { name: 'b.png', width: 100, height: 100, diffPixels: 1000 },
];

test('formats a row with a percentage', () => {
  assert.equal(formatRow(ROWS[0]), 'a.png | 100x100 | 250 | 2.50%');
});

test('summarizes a set of rows', () => {
  const s = summarize(ROWS);
  assert.equal(s.images, 2);
  assert.equal(s.totalDiffPixels, 1250);
  assert.equal(s.largest.name, 'b.png');
});
