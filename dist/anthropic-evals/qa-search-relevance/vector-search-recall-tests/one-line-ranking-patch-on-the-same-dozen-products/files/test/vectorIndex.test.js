'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createIndex } = require('../src/vectorIndex');

const CENTROIDS = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const build = (metric, nProbe = 4) => {
  const index = createIndex({ centroids: CENTROIDS, metric, nProbe });
  index.add('a1', [0.99, 0.14, 0, 0]);
  index.add('a2', [0.97, 0.24, 0, 0]);
  index.add('b1', [0.14, 0.99, 0, 0]);
  index.add('c1', [0, 0, 1, 0]);
  return index;
};

test('every added point is stored exactly once', () => {
  assert.equal(build('ip').size(), 4);
});

test('a query is answered from the cells nearest its direction', () => {
  assert.deepEqual(build('ip', 1).search([1, 0, 0, 0], { k: 3 }), ['a1', 'a2']);
});

test('points outside the probed cells are never returned', () => {
  assert.deepEqual(build('ip', 1).search([0, 0, 1, 0], { k: 4 }), ['c1']);
});

test('comparisons count only the points actually scored', () => {
  const index = build('ip', 1);
  index.resetCounters();
  index.search([1, 0, 0, 0], { k: 10 });
  assert.equal(index.comparisons(), 2);
});

test('an unknown metric is rejected at creation', () => {
  assert.throws(() => createIndex({ centroids: CENTROIDS, metric: 'l2' }), /unknown metric/);
});

test('a dimension mismatch is an error, not a silent drop', () => {
  const index = createIndex({ centroids: CENTROIDS });
  assert.throws(() => index.add('bad', [1, 0, 0]), /dimension mismatch/);
});
