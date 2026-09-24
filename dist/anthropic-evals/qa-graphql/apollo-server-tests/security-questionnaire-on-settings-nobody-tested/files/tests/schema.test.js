import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildServer } from '../src/server.js';

const server = buildServer();

test('customer query returns the record', async () => {
  const res = await server.executeOperation({
    query: '#graphql\n query C($id: ID!) { customer(id: $id) { id customerEmail } }',
    variables: { id: 'c_1' },
  });
  assert.equal(res.body.kind, 'single');
  assert.equal(res.body.singleResult.errors, undefined);
  assert.equal(res.body.singleResult.data.customer.customerEmail, 'ops@meridian.test');
});

test('delivered shipments come back', async () => {
  const res = await server.executeOperation({
    query: '{ shipments(state: DELIVERED) }',
  });
  assert.equal(res.body.kind, 'single');
  assert.equal(res.body.singleResult.data.shipments.length, 2);
});

test('introspection is disabled in production', () => {
  const src = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(src, /introspection: !IS_PRODUCTION/);
});

// Added by Ivan on 2026-09-08 for INC-4502.
test('a misspelled field does not come back with the real one', async () => {
  const res = await server.executeOperation({
    query: '{ custommer(id: "c_1") { id } }',
  });
  assert.equal(res.body.kind, 'single');
  assert.doesNotMatch(res.body.singleResult.errors[0].message, /did you mean/i);
});
