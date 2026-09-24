'use strict';

const test = require('node:test');
const assert = require('node:assert');
const engineA = require('../src/engineA');
const engineB = require('../src/engineB');

const POINTS = [
  ['p1', [1, 0, 0, 0]],
  ['p2', [0.98, 0.2, 0, 0]],
  ['p3', [0.9, 0.44, 0, 0]],
  ['p4', [0, 1, 0, 0]],
  ['p5', [0, 0, 1, 0]],
  ['p6', [0, 0, 0, 1]],
];
const CELLS = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const buildA = (M = 4) => {
  const index = engineA.createIndex({ M });
  for (const [id, vec] of POINTS) index.add(id, vec);
  return index;
};
const buildB = () => {
  const index = engineB.createIndex({ centroids: CELLS });
  for (const [id, vec] of POINTS) index.add(id, vec);
  return index;
};

test('engine A stores every point', () => {
  assert.equal(buildA().size(), 6);
});

test('engine B stores every point', () => {
  assert.equal(buildB().size(), 6);
});

test('engine A returns the exact nearest neighbour on a wide walk', () => {
  assert.equal(buildA().search([1, 0, 0, 0], { k: 1, ef: 32 })[0], 'p1');
});

test('engine B returns the exact nearest neighbour when it scans every cell', () => {
  assert.equal(buildB().search([1, 0, 0, 0], { k: 1 })[0], 'p1');
});

test('engine B confined to one cell cannot see the others', () => {
  assert.deepEqual(buildB().search([0, 0, 1, 0], { k: 6, nProbe: 1 }), ['p5']);
});

test('engine B counts a comparison for every point it scores', () => {
  const index = buildB();
  index.resetCounters();
  index.search([1, 0, 0, 0], { k: 10, nProbe: 1 });
  assert.equal(index.comparisons(), 3);
});

test('engine A counts a comparison for every node it reaches', () => {
  const index = buildA();
  index.resetCounters();
  index.search([1, 0, 0, 0], { k: 10, ef: 32 });
  assert.ok(index.comparisons() > 0);
});
