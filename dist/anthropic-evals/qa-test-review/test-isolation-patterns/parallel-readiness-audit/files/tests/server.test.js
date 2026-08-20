'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../src/server');

test('serves health on the configured port', async () => {
  const server = await startServer({ port: 3000 });
  const response = await fetch('http://localhost:3000/health');
  assert.equal(response.status, 200);
  await server.close();
});
