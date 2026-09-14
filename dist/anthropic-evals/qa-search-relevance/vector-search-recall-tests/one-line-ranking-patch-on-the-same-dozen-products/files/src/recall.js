'use strict';

const { innerProduct } = require('./catalogIndex');
const { toPoints } = require('./ingest');

const K = 10;

// Exhaustive scan of the catalogue, scored the way the index scores.
function groundTruth(docs, queries, k = K) {
  const points = toPoints(docs);
  return queries.map((q) =>
    points
      .map((p) => [p.id, innerProduct(q.vec, p.vec)])
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, k)
      .map(([id]) => id),
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

function measureRecall(index, docs, queries, k = K) {
  const truth = groundTruth(docs, queries, k);
  const retrieved = queries.map((q) => index.query(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

module.exports = { groundTruth, recallAtK, measureRecall, K };
