'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createIndex, cosine } = require('../src/graphIndex');

const points = [
  ['p1', [1, 0, 0, 0]],
  ['p2', [0.98, 0.2, 0, 0]],
  ['p3', [0.9, 0.44, 0, 0]],
  ['p4', [0, 1, 0, 0]],
  ['p5', [0, 0, 1, 0]],
  ['p6', [0, 0, 0, 1]],
];
const build = (M = 4) => {
  const index = createIndex({ M });
  for (const [id, vec] of points) index.add(id, vec);
  return index;
};

test('every added point is stored', () => {
  assert.equal(build().size(), 6);
});

test('a wide walk finds the exact nearest neighbour', () => {
  assert.equal(build().search([1, 0, 0, 0], { k: 1, ef: 32 })[0], 'p1');
});

test('k bounds the number of results', () => {
  assert.equal(build().search([1, 0, 0, 0], { k: 3, ef: 32 }).length, 3);
});

test('a narrower walk scores fewer points than a wider one', () => {
  const ring = createIndex({ M: 3 });
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    ring.add(`r${i}`, [Math.cos(a), Math.sin(a), 0, 0]);
  }
  ring.resetCounters();
  ring.search([1, 0, 0, 0], { k: 5, ef: 4 });
  const narrow = ring.comparisons();
  ring.resetCounters();
  ring.search([1, 0, 0, 0], { k: 5, ef: 40 });
  assert.ok(narrow < ring.comparisons(), 'ef should change how much work a query does');
});

test('M is fixed when the index is created', () => {
  assert.equal(build(4).degree(), 4);
  assert.equal(build(8).degree(), 8);
});

test('cosine ignores magnitude', () => {
  assert.ok(Math.abs(cosine([3, 0], [0.5, 0]) - 1) < 1e-12);
});
