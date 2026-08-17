'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');

const PORT = 4300;
const BASE = `http://127.0.0.1:${PORT}`;

let server;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('health reports ok', async () => {
  const res = await fetch(`${BASE}/health`);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('an unknown route is a 404', async () => {
  const res = await fetch(`${BASE}/nope`);

  assert.equal(res.status, 404);
});
