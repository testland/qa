'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleUpgrade } = require('../src/upgrade');

test('answers 101 to a well-formed upgrade request', () => {
  const response = handleUpgrade({
    method: 'GET',
    httpVersion: '1.1',
    headers: {
      upgrade: 'websocket',
      connection: 'Upgrade',
      'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'sec-websocket-version': '13',
    },
  });

  assert.equal(response.status, 101);
  assert.ok(response.headers['sec-websocket-accept']);
});

test('refuses a request that is not an upgrade', () => {
  const response = handleUpgrade({ method: 'GET', httpVersion: '1.1', headers: {} });

  assert.equal(response.status, 400);
});
