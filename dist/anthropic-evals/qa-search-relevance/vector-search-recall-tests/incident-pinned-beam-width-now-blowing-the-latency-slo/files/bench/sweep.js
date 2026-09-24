'use strict';

const corpus = require('../data/corpus.json');
const queries = require('./queries.json');
const { createIndex } = require('../src/graphIndex');
const { referenceTopK, recallAtK } = require('../src/recall');
const config = require('../config/search.json');

const GRID = [12, 16, 24, 32, 48, 64, 96, 128, 192, 256];

function build() {
  const index = createIndex({ M: config.index.M });
  for (const point of corpus) index.add(point.id, point.vec);
  return index;
}

const truth = referenceTopK(corpus, queries, config.query.k);

console.log('ef\trecall@10\tcomparisons/query');
for (const ef of GRID) {
  const index = build();
  index.resetCounters();
  const retrieved = queries.map((q) => index.search(q.vec, { k: config.query.k, efSearch: ef }));
  const recall = recallAtK(retrieved, truth);
  console.log(`${ef}\t${recall.toFixed(3)}\t\t${(index.comparisons() / queries.length).toFixed(1)}`);
}
