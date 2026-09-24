'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJsonl } = require('../lib/jsonl');

test('reads one object per line and ignores blanks', () => {
  const rows = parseJsonl('{"a":1}\n\n{"a":2}\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[1].a, 2);
});

test('names the offending line', () => {
  assert.throws(() => parseJsonl('{"a":1}\nnope\n'), /line 2/);
});
