'use strict';

const assert = require('node:assert/strict');
const { withRollback } = require('./support/withRollback');
const { queue, cache } = require('../src/infra');
const signup = require('../src/signup');

withRollback('queues a welcome email on signup', async () => {
  await signup.register('cy@example.test');
  assert.equal(await queue.depth('emails'), 1);
  assert.equal(await cache.get('signup:cy@example.test'), 'pending');
});
