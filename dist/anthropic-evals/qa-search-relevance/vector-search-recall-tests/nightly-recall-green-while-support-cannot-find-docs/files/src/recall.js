'use strict';

const K = 10;
const ALL_CELLS = 4;

// Reference answer for a query: the same lookup with nothing skipped.
function exhaustiveScan(index, queries, k = K) {
  return queries.map((q) => index.search(q.vec, { k, nProbe: ALL_CELLS }));
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
  const truth = exhaustiveScan(index, queries, k);
  const retrieved = queries.map((q) => index.search(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

module.exports = { exhaustiveScan, recallAtK, measureRecall, K };
