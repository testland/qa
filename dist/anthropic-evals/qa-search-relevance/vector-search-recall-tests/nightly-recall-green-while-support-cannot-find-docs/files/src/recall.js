'use strict';

const K = 10;
const PROBE_ALL = 4;

// Reference answer for each query: the same index with every cell probed.
function groundTruth(index, queries, k = K) {
  return queries.map((q) => index.search(q.vec, { k, nProbe: PROBE_ALL }));
}

function recallAtK(retrieved, truth) {
  let total = 0;
  for (let i = 0; i < truth.length; i++) {
    const expected = new Set(truth[i]);
    total += retrieved[i].filter((id) => expected.has(id)).length / truth[i].length;
  }
  return total / truth.length;
}

function measureRecall(index, queries, k = K) {
  const truth = groundTruth(index, queries, k);
  const retrieved = queries.map((q) => index.search(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

module.exports = { groundTruth, recallAtK, measureRecall, K };
