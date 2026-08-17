'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PORT } = require('./support/resources');
const { startServer } = require('../src/server');

test('answers on the health endpoint', async () => {
  const server = await startServer({ port: PORT });
  const response = await fetch(`http://localhost:${PORT}/health`);
  assert.equal(response.status, 200);
  await server.close();
});
