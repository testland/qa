'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { dispatch } = require('../src/dispatch.js');

function transportReturning(statuses) {
  const calls = [];
  return {
    calls,
    async sleep() {},
    async post(url, req) {
      calls.push(req);
      return { status: statuses[calls.length - 1] ?? statuses[statuses.length - 1] };
    },
  };
}

test('a 200 on the first attempt delivers once', async () => {
  const transport = transportReturning([200]);
  const result = await dispatch('https://example.test/hook', { type: 'order.created' }, transport);
  assert.deepEqual(result, { delivered: true, attempts: 1 });
  assert.equal(transport.calls.length, 1);
});

test('a 5xx is retried and can still succeed', async () => {
  const transport = transportReturning([503, 503, 200]);
  const result = await dispatch('https://example.test/hook', { type: 'order.created' }, transport);
  assert.equal(result.delivered, true);
  assert.equal(result.attempts, 3);
});

test('a 410 stops immediately', async () => {
  const transport = transportReturning([410]);
  const result = await dispatch('https://example.test/hook', { type: 'order.created' }, transport);
  assert.equal(result.permanent, true);
  assert.equal(transport.calls.length, 1);
});
