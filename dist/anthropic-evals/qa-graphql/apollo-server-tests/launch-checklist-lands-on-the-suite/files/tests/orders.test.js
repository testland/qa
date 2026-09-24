import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApolloServer } from '@apollo/server';

import { typeDefs, resolvers } from '../src/schema.js';
import { ordersRepo } from '../src/data.js';

const server = new ApolloServer({ typeDefs, resolvers });

const signedIn = {
  contextValue: {
    user: { id: 'u_8812', email: 'dana@northwind.test' },
    dataSources: { orders: ordersRepo },
  },
};

const VIEWER_ORDERS = `#graphql
  query ViewerOrders($first: Int!) {
    viewer { id customerEmail orders(first: $first) { id status total } }
  }
`;

test('viewer orders returns the customer own orders', async () => {
  const res = await server.executeOperation(
    { query: VIEWER_ORDERS, variables: { first: 5 } },
    signedIn,
  );

  assert.equal(res.body.kind, 'single');
  assert.equal(res.body.singleResult.errors, undefined);
  assert.equal(res.body.singleResult.data.viewer.orders.length, 2);
});

test('viewer is rejected when nobody is signed in', async () => {
  const res = await server.executeOperation(
    { query: VIEWER_ORDERS, variables: { first: 5 } },
    { contextValue: { user: null, dataSources: { orders: ordersRepo } } },
  );

  assert.equal(res.body.kind, 'single');
  assert.equal(res.body.singleResult.errors?.[0].extensions.code, 'UNAUTHENTICATED');
});
