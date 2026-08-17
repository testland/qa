'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAsyncMemo } = require('./asyncMemo');

test('loads once for repeated calls', async () => {
  let calls = 0;
  const memo = createAsyncMemo(async (key) => {
    calls += 1;
    return `${key}!`;
  });

  const [first, second] = await Promise.all([memo('a'), memo('a')]);

  assert.equal(first, 'a!');
  assert.equal(second, 'a!');
  assert.equal(calls, 1);
});
