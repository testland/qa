'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handlePoll } = require('../src/poll-fallback');

test('refuses an unauthenticated poll', () => {
  const response = handlePoll({ headers: {} }, { drain: () => [] });

  assert.equal(response.status, 401);
});

test('drains the queue for the caller', () => {
  const response = handlePoll(
    { headers: { authorization: 'Bearer t_9' } },
    { drain: () => [{ type: 'message', payload: { id: 1, body: 'hi' } }] },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), {
    events: [{ type: 'message', data: { id: 1, body: 'hi' } }],
  });
});
