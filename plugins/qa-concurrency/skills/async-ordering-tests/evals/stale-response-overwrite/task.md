# Search results flicker back to the previous query

## Problem Description

`src/searchController.js` runs a search on every keystroke. Users report that
results occasionally snap back to what they typed a moment ago: a slow
request for an earlier query lands after a fast request for the current one
and overwrites it.

The controller already carries a guard for this. Nothing tests it. The
existing test resolves one request at a time, so the out-of-order case never
occurs.

## Output Specification

Add `src/searchController.test.js` proving that a response arriving for a
superseded query does not replace the current results, and that the ordering
under test is decided by the test rather than by how fast the machine
happens to be.

Run `npm test` before you finish; it must pass.

Leave `src/searchController.basic.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "search-ui",
  "version": "0.6.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/searchController.js ===============
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

=============== FILE: src/searchController.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSearchController } = require('./searchController');

test('applies results for a single query', async () => {
  const controller = createSearchController(async (query) => [`${query}-hit`]);

  await controller.run('apple');

  assert.deepEqual(controller.snapshot(), { query: 'apple', results: ['apple-hit'] });
});
