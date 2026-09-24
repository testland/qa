import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApolloServer } from '@apollo/server';

import { typeDefs, resolvers } from '../src/schema.js';
import { ordersRepo } from '../src/data.js';

const server = new ApolloServer({ typeDefs, resolvers });

const dana = { id: 'u_8812', email: 'dana@northwind.test' };
const dataSources = { orders: ordersRepo };

const ORDER = `#graphql
  query O($id: ID!) { order(id: $id) { id total } }
`;

test("an order belonging to another customer is refused", async () => {
  const res = await server.executeOperation({
    query: ORDER,
    variables: { id: 'o_2001' },
    context: { user: dana, dataSources },
  });
  assert.equal(res.body.kind, 'single');
  assert.ok(Array.isArray(res.body.singleResult.errors));
});

test('an order id that does not exist comes back empty', async () => {
  const res = await server.executeOperation({
    query: ORDER,
    variables: { id: 'o_9999' },
    context: { user: dana, dataSources },
  });
  assert.equal(res.body.kind, 'single');
  assert.equal(res.body.singleResult.data?.order ?? null, null);
});

test('a signed-out request is refused', async () => {
  const res = await server.executeOperation({
    query: ORDER,
    variables: { id: 'o_1001' },
  });
  assert.equal(res.body.kind, 'single');
  assert.ok(Array.isArray(res.body.singleResult.errors));
});
