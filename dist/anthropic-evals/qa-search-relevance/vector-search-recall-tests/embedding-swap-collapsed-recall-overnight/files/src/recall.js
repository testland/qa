'use strict';

const truthFile = require('../data/ground-truth.json');

function recallAtK(retrieved, truth) {
  let total = 0;
  for (let i = 0; i < truth.length; i++) {
    const expected = new Set(truth[i]);
    total += retrieved[i].filter((id) => expected.has(id)).length / truth[i].length;
  }
  return total / truth.length;
}

function measureRecall(index, queries, k = truthFile.k) {
  const truth = queries.map((q) => truthFile.top_k[q.id]);
  const retrieved = queries.map((q) => index.search(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

function perQueryRecall(index, queries, k = truthFile.k) {
  return queries.map((q) => {
    const expected = new Set(truthFile.top_k[q.id]);
    const got = index.search(q.vec, { k });
    return { id: q.id, recall: got.filter((id) => expected.has(id)).length / expected.size };
  });
}

module.exports = { recallAtK, measureRecall, perQueryRecall };
