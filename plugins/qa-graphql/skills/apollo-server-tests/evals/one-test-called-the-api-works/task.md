# Priya's three new tests are green and I do not believe them

## Problem Description

`tests/schema.test.js` is a single test named `the API works`. It fires nine
operations and ends on one assertion. When it goes red, CI prints

```
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
false !== true
```

and nothing else. Last Thursday it took Priya most of an afternoon to work out
which of the nine had broken; it turned out to be the fifth one, and she found
it by deleting lines until the failure moved.

It is also why the job is unreliable. To get a signed-in user it POSTs to
`https://auth.staging.parcelly.dev/token` before anything runs, and the context
function in `src/context.js` then calls the same service again to introspect the
token on every request. Staging auth is redeployed by its own pipeline several
times a day, so we get a 503 about one run in six and everyone has learned to
press re-run. Two people have told me they now ignore a red graphql job on the
first bounce, which is exactly the habit I do not want.

Priya started the replacement on her branch and got three tests in before she
had to move on to the `orders` field. They are in `tests/orders.test.js` and
they are green. What she told me at standup is that the happy-path versions kept
coming back with no customer on them, so she pushed the three that expect a
refusal and left the rest. I have been staring at those three for twenty minutes
and I cannot convince myself they are testing what their names say. That is the
part I want you to settle first, because if they are not, Priya is going to
write six more in the same shape this afternoon.

Her `src/schema.js` with the new `orders` field is in this tree so you can write
against it.

Two things I want, and you should push back if either is wrong. Keep the
nine-operation test as well, renamed to something honest like `smoke: the API
answers` - it is the only test that has ever caught a broken deploy and I do not
want to lose that. And keep the malformed-query and unknown-field cases from it
even though Ravi says they only test the GraphQL library and not our resolvers.

Two constraints from the platform team. The lockfile is frozen until the Node 22
bump lands, so no new packages. And we are not standing up another stand-in auth
service - the one we had in March drifted from the real token shape and cost us
a day of debugging a test that was lying to us. Nothing in the suite should be
reaching staging when this is done.

## Output Specification

1. Finish the replacement. Every operation the old test covered gets a test of
   its own, named so that a red line in CI names the operation that broke.
2. Priya's three stay or go on their merits. A test that is not checking what
   its name says is a defect, not a style point - fix it or say why it is fine.
3. Cover the new `orders` field: a customer with orders, a customer with none,
   and an order belonging to someone else.
4. Write `docs/test-notes.md`: how a signed-in customer is represented in the
   suite after your change, what the suite no longer exercises as a result, and
   your answer to both of the things I asked for above.

Do not change `src/schema.js` or `src/context.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: src/schema.js ===============
import { GraphQLError } from 'graphql';

export const typeDefs = `#graphql
  type Order {
    id: ID!
    total: Int!
    status: String!
    customerId: ID!
  }

  type Viewer {
    id: ID!
    email: String!
    orders(first: Int!): [Order!]!
  }

  type Query {
    viewer: Viewer
    order(id: ID!): Order
    shipmentStatus(orderId: ID!): String
    health: String!
  }
`;

function requireUser(ctx) {
  if (!ctx.user) {
    throw new GraphQLError('Sign in first', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
}

export const resolvers = {
  Query: {
    health: () => 'ok',

    viewer: (_parent, _args, ctx) => {
      requireUser(ctx);
      return { id: ctx.user.id, email: ctx.user.email };
    },

    order: async (_parent, { id }, ctx) => {
      requireUser(ctx);
      const order = await ctx.dataSources.orders.byId(id);
      if (!order) return null;
      if (order.customerId !== ctx.user.id) {
        throw new GraphQLError('That order belongs to another customer', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return order;
    },

    shipmentStatus: async (_parent, { orderId }, ctx) => {
      requireUser(ctx);
      const order = await ctx.dataSources.orders.byId(orderId);
      return order?.status ?? null;
    },
  },

  Viewer: {
    // Added on priya/orders-field.
    orders: async (parent, { first }, ctx) => {
      if (first < 1 || first > 50) {
        throw new GraphQLError('first must be between 1 and 50', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      return ctx.dataSources.orders.forCustomer(parent.id, first);
    },
  },
};

=============== FILE: src/data.js ===============
const ORDERS = [
  { id: 'o_1001', customerId: 'u_8812', total: 4200, status: 'in_transit' },
  { id: 'o_1002', customerId: 'u_8812', total: 1150, status: 'delivered' },
  { id: 'o_1003', customerId: 'u_8812', total: 9900, status: 'delivered' },
  { id: 'o_2001', customerId: 'u_4410', total: 700, status: 'in_transit' },
];

export const ordersRepo = {
  byId: async (id) => ORDERS.find((o) => o.id === id) ?? null,
  forCustomer: async (customerId, first) =>
    ORDERS.filter((o) => o.customerId === customerId).slice(0, first),
};

=============== FILE: src/context.js ===============
import { ordersRepo } from './data.js';

const AUTH_BASE = process.env.AUTH_BASE ?? 'https://auth.staging.parcelly.dev';

export async function contextFor({ req }) {
  const header = req.headers.authorization ?? '';
  const dataSources = { orders: ordersRepo };

  if (!header.startsWith('Bearer ')) {
    return { user: null, dataSources };
  }

  const res = await fetch(`${AUTH_BASE}/introspect`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: header.slice(7) }),
  });

  if (!res.ok) {
    throw new Error(`introspect failed: ${res.status}`);
  }

  const claims = await res.json();
  if (!claims.active) {
    return { user: null, dataSources };
  }

  return {
    user: { id: claims.sub, email: claims.email, tenantId: claims.tenant },
    dataSources,
  };
}

=============== FILE: tests/orders.test.js ===============
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

=============== FILE: tests/schema.test.js ===============
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

=============== FILE: package.json ===============
{
  "name": "parcelly-api",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  },
  "dependencies": {
    "@apollo/server": "^4.11.3",
    "graphql": "^16.9.0"
  }
}
