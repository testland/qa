import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { typeDefs, resolvers } from '../src/schema.js';
import { contextFor } from '../src/context.js';

let server;
let url;
let token;

before(async () => {
  const auth = await fetch('https://auth.staging.parcelly.dev/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: 'e2e-suite',
      client_secret: process.env.E2E_SECRET,
      sub: 'u_8812',
    }),
  });
  if (!auth.ok) throw new Error(`auth ${auth.status}`);
  ({ access_token: token } = await auth.json());

  server = new ApolloServer({ typeDefs, resolvers });
  ({ url } = await startStandaloneServer(server, {
    listen: { port: 0 },
    context: contextFor,
  }));
});

after(async () => {
  await server?.stop();
});

const gql = (query, variables) =>
  fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json());

test('the API works', async () => {
  let ok = true;

  const health = await gql('{ health }');
  ok = ok && health.data?.health === 'ok';

  const viewer = await gql('{ viewer { id email } }');
  ok = ok && viewer.data?.viewer?.id === 'u_8812';
  ok = ok && viewer.data?.viewer?.email === 'dana@northwind.test';

  const mine = await gql('query O($id: ID!) { order(id: $id) { id total } }', { id: 'o_1001' });
  ok = ok && mine.data?.order?.total === 4200;

  const missing = await gql('query O($id: ID!) { order(id: $id) { id } }', { id: 'o_9999' });
  ok = ok && missing.data?.order === null;

  const theirs = await gql('query O($id: ID!) { order(id: $id) { id } }', { id: 'o_2001' });
  ok = ok && Array.isArray(theirs.errors);

  const status = await gql('query S($id: ID!) { shipmentStatus(orderId: $id) }', { id: 'o_1002' });
  ok = ok && status.data?.shipmentStatus === 'delivered';

  const noStatus = await gql('query S($id: ID!) { shipmentStatus(orderId: $id) }', { id: 'o_9999' });
  ok = ok && noStatus.data?.shipmentStatus === null;

  const unknownField = await gql('{ viewer { nickname } }');
  ok = ok && Array.isArray(unknownField.errors);

  const malformed = await gql('{ viewer { id ');
  ok = ok && Array.isArray(malformed.errors);

  assert.equal(ok, true);
});
