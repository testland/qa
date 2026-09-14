'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createIndex, cosine } = require('../src/graphIndex');

// A ring of 24 points, so a narrow beam started at point 0 cannot see all of it.
const ring = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * 2 * Math.PI;
  return [Math.cos(a), Math.sin(a), 0.1 * Math.cos(3 * a), 0.1 * Math.sin(3 * a)];
});

const build = (opts) => {
  const index = createIndex(opts);
  ring.forEach((v, i) => index.add(i, v));
  return index;
};

test('every added point is stored', () => {
  assert.equal(build({ M: 4, efConstruct: 16 }).size(), 24);
});

test('a node keeps at most M links', () => {
  const index = build({ M: 4, efConstruct: 16 });
  for (let i = 0; i < 24; i++) assert.ok(index.degree(i) <= 4, `node ${i} has ${index.degree(i)} links`);
});

test('M is fixed when the index is built', () => {
  assert.deepEqual(build({ M: 4, efConstruct: 16 }).params(), { M: 4, efConstruct: 16 });
  assert.ok(build({ M: 8, efConstruct: 16 }).degree(3) > build({ M: 2, efConstruct: 16 }).degree(3));
});

test('a search returns k ids', () => {
  assert.equal(build({ M: 4, efConstruct: 16 }).search(ring[11], { k: 5, ef: 16 }).length, 5);
});

test('a wider beam costs more comparisons', () => {
  const index = build({ M: 4, efConstruct: 16 });
  index.resetCounters();
  index.search(ring[11], { k: 5, ef: 2 });
  const narrow = index.comparisons();
  index.resetCounters();
  index.search(ring[11], { k: 5, ef: 24 });
  assert.ok(index.comparisons() > narrow, `${index.comparisons()} should exceed ${narrow}`);
});

test('cosine ignores magnitude', () => {
  assert.ok(Math.abs(cosine([3, 0], [0.5, 0]) - 1) < 1e-12);
});
