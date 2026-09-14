'use strict';

const { ingest } = require('./ingest');

function buildCatalogue(docs) {
  return ingest(docs);
}

function searchCatalogue(index, queryVec, k = 10) {
  return index.query(queryVec, { k });
}

module.exports = { buildCatalogue, searchCatalogue };
