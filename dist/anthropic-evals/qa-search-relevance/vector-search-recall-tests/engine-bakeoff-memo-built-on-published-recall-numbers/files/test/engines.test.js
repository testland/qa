'use strict';

const test = require('node:test');
const assert = require('node:assert');
const engineA = require('../src/engineA');
const engineB = require('../src/engineB');

const CELLS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const ring = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * 2 * Math.PI;
  return [Math.cos(a), Math.sin(a), 0.1 * Math.cos(3 * a)];
});

test('engine A stores every added vector', () => {
  const index = engineA.createIndex({ centroids: CELLS, nProbe: 2 });
  ring.forEach((v, i) => index.add(i, v));
  assert.equal(index.size(), 24);
});

test('engine A only scores the cells it probes', () => {
  const index = engineA.createIndex({ centroids: CELLS, nProbe: 1 });
  ring.forEach((v, i) => index.add(i, v));
  index.resetCounters();
  index.search([1, 0, 0], { k: 10 });
  assert.equal(index.comparisons(), index.cellSizes()[0]);
});

test('engine A probing every cell scores every vector', () => {
  const index = engineA.createIndex({ centroids: CELLS, nProbe: 3 });
  ring.forEach((v, i) => index.add(i, v));
  index.resetCounters();
  index.search([1, 0, 0], { k: 10 });
  assert.equal(index.comparisons(), 24);
});

test('engine B stores every added vector', () => {
  const index = engineB.createIndex({ M: 4, efConstruct: 16 });
  ring.forEach((v, i) => index.add(i, v));
  assert.equal(index.size(), 24);
});

test('engine B keeps at most M links per node', () => {
  const index = engineB.createIndex({ M: 4, efConstruct: 16 });
  ring.forEach((v, i) => index.add(i, v));
  for (let i = 0; i < 24; i++) assert.ok(index.degree(i) <= 4);
});

test('engine B walks further with a wider beam', () => {
  const index = engineB.createIndex({ M: 4, efConstruct: 16 });
  ring.forEach((v, i) => index.add(i, v));
  index.resetCounters();
  index.search(ring[7], { k: 5, ef: 2 });
  const narrow = index.comparisons();
  index.resetCounters();
  index.search(ring[7], { k: 5, ef: 24 });
  assert.ok(index.comparisons() > narrow);
});
