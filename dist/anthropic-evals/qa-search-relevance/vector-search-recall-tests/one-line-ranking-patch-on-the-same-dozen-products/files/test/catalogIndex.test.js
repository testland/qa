'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createIndex, innerProduct } = require('../src/catalogIndex');

const CENTROIDS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const build = (nProbe) => {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  index.upsert('a1', [0.9, 0.44, 0]);
  index.upsert('a2', [0.97, 0.24, 0]);
  index.upsert('b1', [0.24, 0.97, 0]);
  index.upsert('c1', [0, 0, 1]);
  return index;
};

test('every upserted point is stored', () => {
  assert.equal(build(3).size(), 4);
});

test('a query is answered from the best-scoring cell first', () => {
  assert.deepEqual(build(1).query([1, 0, 0], { k: 2 }), ['a2', 'a1']);
});

test('points outside the probed cells are not returned', () => {
  assert.deepEqual(build(1).query([0, 0, 1], { k: 4 }), ['c1']);
});

test('score grows with the length of the stored vector', () => {
  const index = createIndex({ centroids: CENTROIDS, nProbe: 3 });
  index.upsert('near', [0.99, 0.14, 0]);
  index.upsert('far-but-long', [1.8, 1.2, 0]);
  assert.deepEqual(index.query([1, 0, 0], { k: 1 }), ['far-but-long']);
});

test('comparisons count the points actually scored', () => {
  const index = build(1);
  index.resetCounters();
  index.query([1, 0, 0], { k: 10 });
  assert.equal(index.comparisons(), 2);
});

test('innerProduct is the plain dot product', () => {
  assert.equal(innerProduct([1, 2, 3], [4, 5, 6]), 32);
});
