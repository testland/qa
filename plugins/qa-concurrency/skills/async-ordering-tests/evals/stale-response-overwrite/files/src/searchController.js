'use strict';

function createSearchController(search) {
  let latestSequence = 0;
  let state = { query: null, results: [] };

  return {
    async run(query) {
      latestSequence += 1;
      const sequence = latestSequence;
      const results = await search(query);
      if (sequence !== latestSequence) {
        return { applied: false, reason: 'SUPERSEDED' };
      }
      state = { query, results };
      return { applied: true, reason: null };
    },
    snapshot() {
      return state;
    },
  };
}

module.exports = { createSearchController };
