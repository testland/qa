import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../lib/csv.mjs';

test('parses a header and numeric cells', () => {
  const rows = parseCsv('a,b\n1,x\n2.5,y\n');
  assert.deepEqual(rows, [
    { a: 1, b: 'x' },
    { a: 2.5, b: 'y' },
  ]);
});

test('ignores blank trailing lines', () => {
  assert.equal(parseCsv('a\n1\n\n\n').length, 1);
});
