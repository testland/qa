'use strict';

const K = 10;
const REFERENCE = require('../data/ground-truth.json');

function recallAtK(retrieved, truth) {
  let total = 0;
  for (let i = 0; i < truth.length; i++) {
    const expected = new Set(truth[i]);
    total += retrieved[i].filter((id) => expected.has(id)).length / truth[i].length;
  }
  return total / truth.length;
}

function measureRecall(index, queries, k = K) {
  const truth = queries.map((q) => REFERENCE[q.id].slice(0, k));
  const retrieved = queries.map((q) => index.search(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

function perQueryRecall(index, queries, k = K) {
  return queries.map((q) => {
    const expected = new Set(REFERENCE[q.id].slice(0, k));
    const got = index.search(q.vec, { k });
    return { id: q.id, text: q.text, recall: got.filter((id) => expected.has(id)).length / expected.size };
  });
}

module.exports = { recallAtK, measureRecall, perQueryRecall, REFERENCE, K };
