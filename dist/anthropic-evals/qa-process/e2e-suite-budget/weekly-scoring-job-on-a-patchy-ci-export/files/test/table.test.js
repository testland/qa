'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toMarkdownTable } = require('../lib/table');

test('renders a header, a rule and one row per entry', () => {
  const out = toMarkdownTable([{ a: 1, b: 'x' }, { a: 2 }], ['a', 'b']);
  assert.deepEqual(out.split('\n'), ['| a | b |', '| --- | --- |', '| 1 | x |', '| 2 |  |']);
});
