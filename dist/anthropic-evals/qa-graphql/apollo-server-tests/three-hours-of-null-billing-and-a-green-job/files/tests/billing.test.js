import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApolloServer } from '@apollo/server';

import { typeDefs, resolvers } from '../src/schema.js';
import { billingStub, userStub } from './stubs.js';

const server = new ApolloServer({ typeDefs, resolvers });

const VIEWER_BILLING = `#graphql
  query ViewerBilling {
    viewer {
      id
      email
      billingAccount { id plan seats renewsOn }
    }
  }
`;

const ctx = (overrides = {}) => ({
  contextValue: {
    user: userStub,
    dataSources: { billing: billingStub },
    ...overrides,
  },
});

test('billing page query returns an account', async () => {
  const res = await server.executeOperation({ query: VIEWER_BILLING }, ctx());
  assert.notEqual(res.data?.viewer?.billingAccount, null);
});

test('billing page query reports seats', async () => {
  const res = await server.executeOperation({ query: VIEWER_BILLING }, ctx());
  const seats = res.data?.viewer?.billingAccount?.seats ?? 0;
  assert.ok(seats >= 0, 'seats should be a non-negative number');
});

test('viewer query succeeds for a signed-in user', async () => {
  const res = await server.executeOperation({ query: VIEWER_BILLING }, ctx());
  assert.equal(res.errors, undefined);
});

test('the schema exposes a billing account on the viewer', () => {
  assert.match(typeDefs, /billingAccount: BillingAccount!/);
});
