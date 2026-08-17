'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { configure, reset } = require('../src/settings');
const client = require('../src/client');

beforeEach(() => {
  reset();
});

test('uses the default retry count', () => {
  assert.equal(client.retries(), 2);
});

test('honours a configured retry count', () => {
  configure({ retries: 5 });
  assert.equal(client.retries(), 5);
});

test('goes back to the default retry count', () => {
  assert.equal(client.retries(), 2);
});

test('builds the endpoint for a configured region', () => {
  configure({ region: 'us', endpoint: 'https://us.api.test' });
  assert.equal(client.endpoint(), 'https://us.api.test/v1/us');
});

test('builds the endpoint for the default region', () => {
  assert.equal(client.endpoint(), 'https://eu.api.test/v1/eu');
});
