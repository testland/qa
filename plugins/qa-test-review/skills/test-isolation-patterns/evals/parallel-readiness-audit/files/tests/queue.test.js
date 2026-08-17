'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { enqueue, drainedCount } = require('../src/queue');

test('drains the queue', async () => {
  enqueue({ id: 1 });
  enqueue({ id: 2 });
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.equal(drainedCount(), 2);
});
