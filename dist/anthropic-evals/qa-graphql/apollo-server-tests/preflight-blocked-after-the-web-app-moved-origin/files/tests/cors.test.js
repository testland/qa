import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApolloServer } from '@apollo/server';

import { typeDefs, resolvers } from '../src/schema.js';
import { allowedOrigins, corsOptions } from '../src/cors-options.js';

const server = new ApolloServer({ typeDefs, resolvers });

test('the marketing origin is allowed', () => {
  assert.ok(allowedOrigins.includes('https://parcelly.com'));
});

test('cors is configured for credentialed requests', () => {
  assert.equal(corsOptions.credentials, true);
  assert.deepEqual(corsOptions.methods, ['POST', 'OPTIONS']);
});

test('a request from an allowed origin is served', async () => {
  const res = await server.executeOperation(
    { query: '{ health }' },
    { contextValue: { origin: 'https://parcelly.com' } },
  );
  assert.equal(res.body.kind, 'single');
  assert.equal(res.body.singleResult.errors, undefined);
  assert.equal(res.body.singleResult.data.health, 'ok');
});

test('a request from an unknown origin is not served data it should not get', async () => {
  const res = await server.executeOperation(
    { query: '{ health }' },
    { contextValue: { origin: 'https://evil.example' } },
  );
  assert.equal(res.body.kind, 'single');
  assert.ok(!allowedOrigins.includes('https://evil.example'));
});
