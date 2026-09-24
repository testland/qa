'use strict';

const { dot } = require('./vectorIndex');

const K = 10;

// Reference answer for a query: every product in the catalogue, scored the way
// the index scores, best first. No cells skipped, nothing approximated.
function referenceTopK(catalogue, queries, k = K) {
  return queries.map((q) =>
    catalogue
      .map((p) => [p.id, dot(q.vec, p.vec)])
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, k)
      .map(([id]) => id)
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

function measureRecall(index, catalogue, queries, k = K) {
  const truth = referenceTopK(catalogue, queries, k);
  const retrieved = queries.map((q) => index.search(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

module.exports = { referenceTopK, recallAtK, measureRecall, K };
