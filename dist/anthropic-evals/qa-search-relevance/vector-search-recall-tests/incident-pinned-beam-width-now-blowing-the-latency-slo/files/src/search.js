'use strict';

const { createIndex } = require('./graphIndex');
const { SEARCH } = require('./searchConfig');

function buildIndex(vectors) {
  const index = createIndex({ M: SEARCH.M, efConstruct: SEARCH.efConstruct });
  vectors.forEach((vec, i) => index.add(i, vec));
  return index;
}

function search(index, queryVec, k = 10) {
  return index.search(queryVec, { k, ef: SEARCH.ef });
}

module.exports = { buildIndex, search };
