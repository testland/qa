import { test, before } from 'node:test';
import assert from 'node:assert/strict';

import { buildApp } from '../src/app.js';

let app;

before(async () => {
  ({ app } = await buildApp());
  app.listen(4000);
});

test('the graphql endpoint answers over http', async () => {
  const res = await fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ health }' }),
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.health, 'ok');
});
