'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePageParams } = require('./pagination');

test('accepts an ordinary page request', () => {
  const result = parsePageParams({ limit: 25, offset: 0 });
  assert.deepEqual(result, { ok: true, code: null, limit: 25, offset: 0 });
});
