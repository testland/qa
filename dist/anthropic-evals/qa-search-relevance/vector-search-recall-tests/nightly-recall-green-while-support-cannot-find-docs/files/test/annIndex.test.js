'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createIndex, cosine } = require('../src/annIndex');

const CENTROIDS = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const build = (nProbe) => {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  index.add('a1', [0.99, 0.14, 0, 0]);
  index.add('a2', [0.97, 0.24, 0, 0]);
  index.add('b1', [0.14, 0.99, 0, 0]);
  index.add('c1', [0, 0, 1, 0]);
  index.add('d1', [0, 0, 0, 1]);
  return index;
};

test('every added point is stored exactly once', () => {
  assert.equal(build(2).size(), 5);
});

test('a query is answered from its own cell first', () => {
  assert.deepEqual(build(1).search([1, 0, 0, 0], { k: 2 }), ['a1', 'a2']);
});

test('points outside the probed cells are never returned', () => {
  assert.deepEqual(build(1).search([0, 0, 1, 0], { k: 5 }), ['c1']);
});

test('probing every cell reaches every point', () => {
  assert.equal(build(4).search([1, 0, 0, 0], { k: 5 }).length, 5);
});

test('comparisons count only the points actually scored', () => {
  const index = build(1);
  index.resetCounters();
  index.search([1, 0, 0, 0], { k: 10 });
  assert.equal(index.comparisons(), 2);
});

test('cosine ignores magnitude', () => {
  assert.ok(Math.abs(cosine([3, 0], [0.5, 0]) - 1) < 1e-12);
});
