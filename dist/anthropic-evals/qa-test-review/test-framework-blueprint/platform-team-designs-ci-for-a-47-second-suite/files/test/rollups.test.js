'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { rollup } = require('../src/rollups');

test('buckets events to the floor of the interval', () => {
  assert.deepEqual(
    rollup([{ t: 0, count: 1 }, { t: 59, count: 2 }, { t: 60, count: 4 }], 60),
    [{ t: 0, count: 3 }, { t: 60, count: 4 }],
  );
});

test('returns an empty series when there are no events', () => {
  assert.deepEqual(rollup([], 60), []);
});
