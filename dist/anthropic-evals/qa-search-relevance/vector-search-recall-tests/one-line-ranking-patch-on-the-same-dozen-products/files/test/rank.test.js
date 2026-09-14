'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { prepareQuery } = require('../src/rank');

test('prepareQuery returns a vector of the same width', () => {
  assert.equal(prepareQuery([1, 2, 3, 4, 5, 6]).length, 6);
});

test('prepareQuery does not mutate its argument', () => {
  const v = [1, 2, 3, 4, 5, 6];
  prepareQuery(v);
  assert.deepEqual(v, [1, 2, 3, 4, 5, 6]);
});
