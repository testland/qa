'use strict';

const { cosine } = require('./engineB');

// Reference answer for each query: every point in the corpus, exactly scored.
function referenceTopK(corpus, queries, k = 10) {
  return queries.map((q) =>
    corpus
      .map((p) => [p.id, cosine(q.vec, p.vec)])
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

module.exports = { referenceTopK, recallAtK };
