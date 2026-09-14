'use strict';

const corpus = require('../data/corpus.json');
const queries = require('../data/queries.json');
const engineA = require('../src/engineA');
const engineB = require('../src/engineB');
const { referenceTopK, recallAtK } = require('../src/recall');

const K = 10;

// Each engine's own documented range for its query-time effort knob.
const GRIDS = {
  A: [12, 16, 20, 24, 32],
  B: [1, 2, 3, 4, 5],
};

const truth = referenceTopK(corpus, queries, K);

function buildA() {
  const index = engineA.createIndex({ M: 4 });
  for (const p of corpus) index.add(p.id, p.vec);
  return index;
}

function buildB() {
  const index = engineB.createIndex({ centroids: engineB.CENTROIDS });
  for (const p of corpus) index.add(p.id, p.vec);
  return index;
}

function runEngine(index, param) {
  const retrieved = queries.map((q) => index.search(q.vec, { k: K, ef: param }));
  return recallAtK(retrieved, truth);
}

for (const [name, build, grid] of [['A', buildA, GRIDS.A], ['B', buildB, GRIDS.B]]) {
  for (const param of grid) {
    console.log(`engine ${name}\tsetting ${param}\trecall@10 ${runEngine(build(), param).toFixed(3)}`);
  }
}
