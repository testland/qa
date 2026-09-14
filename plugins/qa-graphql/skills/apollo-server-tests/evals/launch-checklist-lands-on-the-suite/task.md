# Six things Hana wants green before the gateway goes public

## Problem Description

The gateway opens to the public on 2026-10-01. Hana runs the launch review and
she has sent round a list of six things she wants "covered in the graphql job"
before she signs off. Her list is in `docs/launch-checklist.md` and it is not
unreasonable - every item on it is something a customer could hit in the first
week.

We have two weeks and I have one engineer. What I want back is a straight read
on her list: for each numbered item, either a test in this repo that goes red
when the thing she is worried about is true, or a clear statement of what it
would actually take, so she can decide where to spend the time. She will accept
"not this job" for an item - she will not accept finding out in November that
something on her list was ticked off by a test that never looked at it. That
happened to us with the CORS list in September and she has not forgotten.

The service is in `src/`. There are two tests in `tests/orders.test.js` that
pass today; use them as the shape for anything you add.

## Output Specification

1. Write `docs/launch-coverage.md` with one verdict per numbered item from
   Hana's list: covered by a test you added in this change, or not covered here -
   and in that case what it would take instead, concretely enough for her to
   scope it.
2. Write the tests for the items you mark as covered, under `tests/`.
3. Every test you add corresponds to an item you marked covered. Do not add a
   test for an item you did not mark covered.
4. Do not change anything under `src/`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/launch-checklist.md ===============
# Public launch - things I want covered before I sign off

Hana Okoye, 2026-09-16. Target date 2026-10-01.

1. A query asking for `orders(first: -3)` comes back as a client error with our
   own error code on it, not as a 500 and not as an empty list.
2. A client that sends its 101st operation inside one minute on the same API key
   gets a 429 back. We turned the limiter on last month and nobody has seen it
   work.
3. Schema introspection does not answer on the production build. Meridian's
   security review found it on in September and I want it held down.
4. An operation carrying a bearer token that expired ten minutes ago is rejected
   rather than served. This is the one I would lose sleep over.
5. A query naming a field that does not exist does not come back with a
   suggestion telling the caller what the real field is called.
6. `orderUpdated` actually reaches a subscribed client when an order's status
   changes. The mobile team is shipping on this in 3.6.

=============== FILE: src/schema.js ===============
import { GraphQLError } from 'graphql';

export const typeDefs = `#graphql
  type Order {
    id: ID!
    total: Int!
    status: String!
    trackingCode: String
    customerId: ID!
  }

  type Viewer {
    id: ID!
    customerEmail: String!
    orders(first: Int!): [Order!]!
  }

  type Query {
    viewer: Viewer
    health: String!
  }

  type Subscription {
    orderUpdated(orderId: ID!): Order!
  }
`;

export const resolvers = {
  Query: {
    health: () => 'ok',
    viewer: (_parent, _args, ctx) => {
      if (!ctx.user) {
        throw new GraphQLError('Sign in first', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return { id: ctx.user.id, customerEmail: ctx.user.email };
    },
  },

  Viewer: {
    orders: async (parent, { first }, ctx) => {
      if (first < 1 || first > 50) {
        throw new GraphQLError('first must be between 1 and 50', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      return ctx.dataSources.orders.forCustomer(parent.id, first);
    },
  },

  Subscription: {
    orderUpdated: {
      subscribe: (_parent, { orderId }, ctx) =>
        ctx.pubsub.asyncIterator([`ORDER_UPDATED:${orderId}`]),
    },
  },
};

=============== FILE: src/data.js ===============
const ORDERS = [
  { id: 'o_1001', customerId: 'u_8812', total: 4200, status: 'in_transit', trackingCode: 'PZ4410' },
  { id: 'o_1002', customerId: 'u_8812', total: 1150, status: 'delivered', trackingCode: 'PZ4411' },
  { id: 'o_2001', customerId: 'u_4410', total: 700, status: 'in_transit', trackingCode: null },
];

export const ordersRepo = {
  byId: async (id) => ORDERS.find((o) => o.id === id) ?? null,
  forCustomer: async (customerId, first) =>
    ORDERS.filter((o) => o.customerId === customerId).slice(0, first),
};

=============== FILE: src/context.js ===============
import { GraphQLError } from 'graphql';
import { ordersRepo } from './data.js';

function decodeClaims(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch {
    return null;
  }
}

export async function contextFor({ req }) {
  const dataSources = { orders: ordersRepo };
  const header = req.headers.authorization ?? '';

  if (!header.startsWith('Bearer ')) {
    return { user: null, dataSources };
  }

  const claims = decodeClaims(header.slice(7));
  if (!claims) {
    throw new GraphQLError('Malformed token', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }

  if (claims.exp * 1000 <= Date.now()) {
    throw new GraphQLError('Token expired', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }

  return {
    user: { id: claims.sub, email: claims.email },
    dataSources,
  };
}

=============== FILE: src/server.js ===============
import { createServer } from 'node:http';
import express from 'express';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import { typeDefs, resolvers } from './schema.js';
import { contextFor } from './context.js';

export const schema = makeExecutableSchema({ typeDefs, resolvers });

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  keyGenerator: (req) => req.headers['x-api-key'] ?? req.ip,
  standardHeaders: true,
});

export async function start(port = Number(process.env.PORT ?? 4000)) {
  const app = express();
  const httpServer = createServer(app);

  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const wsCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    introspection: process.env.NODE_ENV !== 'production',
    hideSchemaDetailsFromClientErrors: true,
    plugins: [
      {
        async serverWillStart() {
          return { async drainServer() { await wsCleanup.dispose(); } };
        },
      },
    ],
  });
  await server.start();

  app.use('/graphql', limiter, bodyParser.json(), expressMiddleware(server, { context: contextFor }));

  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  return { httpServer, server };
}

=============== FILE: tests/orders.test.js ===============
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

=============== FILE: package.json ===============
{
  "name": "parcelly-gateway",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  },
  "dependencies": {
    "@apollo/server": "^4.11.3",
    "@graphql-tools/schema": "^10.0.6",
    "body-parser": "^1.20.3",
    "express": "^4.21.2",
    "express-rate-limit": "^7.4.1",
    "graphql": "^16.9.0",
    "graphql-ws": "^5.16.0",
    "ws": "^8.18.0"
  }
}
