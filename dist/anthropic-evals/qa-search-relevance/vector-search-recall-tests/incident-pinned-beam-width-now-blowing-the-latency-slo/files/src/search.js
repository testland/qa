'use strict';

const { createIndex } = require('./graphIndex');
const config = require('../config/search.json');

function buildIndex(corpus) {
  const index = createIndex({ M: config.index.M });
  for (const point of corpus) index.add(point.id, point.vec);
  return index;
}

function runQueries(index, queries) {
  return queries.map((q) => index.search(q.vec, { k: config.query.k, ef: config.query.ef }));
}

module.exports = { buildIndex, runQueries, config };
