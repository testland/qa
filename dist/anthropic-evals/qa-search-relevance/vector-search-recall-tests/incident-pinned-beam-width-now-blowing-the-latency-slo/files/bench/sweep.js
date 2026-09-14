'use strict';

const { createIndex, cosine } = require('../src/graphIndex');
const { SEARCH } = require('../src/searchConfig');
const vectors = require('../data/vectors.json');
const queries = require('../data/queries.json');

const K = 10;
const GRID = [12, 24, 48, 96, 192, 384];

function groundTruth(k = K) {
  return queries.map((q) =>
    vectors
      .map((v, i) => [i, cosine(q, v)])
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

function run() {
  const index = createIndex({ M: SEARCH.M, efConstruct: SEARCH.efConstruct });
  vectors.forEach((v, i) => index.add(i, v));
  const truth = groundTruth();

  const rows = [];
  for (const value of GRID) {
    index.resetCounters();
    const retrieved = queries.map((q) => index.search(q, { k: K, efConstruct: value }));
    rows.push({
      efConstruct: value,
      recall: Number(recallAtK(retrieved, truth).toFixed(3)),
      comparisonsPerQuery: Number((index.comparisons() / queries.length).toFixed(1)),
    });
  }
  return rows;
}

if (require.main === module) {
  console.table(run());
}

module.exports = { run, groundTruth, recallAtK, K };
