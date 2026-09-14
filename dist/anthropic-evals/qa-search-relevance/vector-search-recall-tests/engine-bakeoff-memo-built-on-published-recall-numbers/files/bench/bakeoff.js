'use strict';

const engineA = require('../src/engineA');
const engineB = require('../src/engineB');
const cells = require('../data/engine-a-cells.json');
const vectors = require('../data/vectors.json');
const queries = require('../data/queries.json');

const K = 10;

// Vendor-recommended defaults for a corpus this size.
const A_DEFAULT_NPROBE = 4;
const B_DEFAULT_EF = 24;

function groundTruth(k = K) {
  return queries.map((q) =>
    vectors
      .map((v, i) => [i, engineA.cosine(q, v)])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, k)
      .map(([i]) => i),
  );
}

function recallAtK(retrieved, truth) {
  let total = 0;
  for (let i = 0; i < truth.length; i++) {
    const expected = new Set(truth[i]);
    total += retrieved[i].filter((id) => expected.has(id)).length / truth[i].length;
  }
  return total / truth.length;
}

function buildA() {
  const index = engineA.createIndex({ centroids: cells, nProbe: A_DEFAULT_NPROBE });
  vectors.forEach((v, i) => index.add(i, v));
  return index;
}

function buildB() {
  const index = engineB.createIndex({ M: 6, efConstruct: 24 });
  vectors.forEach((v, i) => index.add(i, v));
  return index;
}

function run() {
  const truth = groundTruth();
  const a = buildA();
  const b = buildB();
  return [
    {
      engine: 'A',
      recall: Number(recallAtK(queries.map((q) => a.search(q, { k: K })), truth).toFixed(3)),
    },
    {
      engine: 'B',
      recall: Number(recallAtK(queries.map((q) => b.search(q, { k: K, ef: B_DEFAULT_EF })), truth).toFixed(3)),
    },
  ];
}

if (require.main === module) console.table(run());

module.exports = { run, groundTruth, recallAtK, buildA, buildB, K };
