'use strict';

// Applied to the query vector before it reaches the index. #2291 proposes
// raising QUERY_BOOST from 1.0 to 1.35.
const QUERY_BOOST = 1.0;

function prepareQuery(vec) {
  return vec.map((x) => x * QUERY_BOOST);
}

module.exports = { prepareQuery, QUERY_BOOST };
