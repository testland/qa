'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSearchController } = require('./searchController');

test('applies results for a single query', async () => {
  const controller = createSearchController(async (query) => [`${query}-hit`]);

  await controller.run('apple');

  assert.deepEqual(controller.snapshot(), { query: 'apple', results: ['apple-hit'] });
});
