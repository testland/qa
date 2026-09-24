# The answer we drafted for Meridian is not true and I need to know which half

## Problem Description

Meridian is the 180-seat deal we have been working since June. Their security
review came back on 2026-09-02 with two findings, both from their own scan of
`api.parcelly.com`:

1. Schema introspection answers on the production endpoint. They pulled the
   whole type map and pasted it into the report.
2. A query with a misspelled field came back with `Did you mean
   "customerEmail"?`. They filed it as information disclosure, and they are
   right - that suggestion enumerates our schema one guess at a time, before
   authentication.

Finding 1 was a deploy problem. The Helm values set `NODE_ENV: prod`, the server
checks for the string `production`, and so the flag we thought was off had been
on since the chart's first commit in November. Platform corrected the values
file on Tuesday. What I cannot send back to Meridian is "we corrected a YAML
file". This is the third time introspection has been on in production - twice
from someone editing the server file, once from the chart - and their
questionnaire asks, literally, "is this enforced by an automated check". Today
the honest answer is no. `tests/schema.test.js` has been green every run this
year, including every run in the ten months introspection was answering in
production.

Finding 2 is the part I need a second opinion on. Ivan pushed a change on
Tuesday that he says closes it, and he added a test for it that is green, and
the draft response I have in front of me claims finding 2 is closed and
enforced. I would rather find that out from you than from Meridian's re-scan.

Separately, Adeel (security lead) wants two things this week. He wants us to
turn on the persisted-query allowlist so the server only runs operations that
are in the generated manifest. And he wants a test that proves an unregistered
operation is rejected, which he says he needs for the questionnaire whether or
not we ship the flag. Last week's traffic breakdown is in the repo.

I need something I can attach by Friday.

## Output Specification

1. Say whether what is on `main` actually closes finding 2. If it does not,
   close it.
2. The questionnaire answer has to be "yes, enforced by an automated check" for
   every finding where that is true after this change, and has to say so
   honestly where it is not. Whatever you write, the check has to be able to go
   red for the reason the finding describes.
3. Write `docs/meridian-response.md`, and answer both of Adeel's asks in it.
4. Do not change `src/schema.js`. `deploy/api.values.yaml` is already fixed.

## Input Files

Extract the following files before beginning.

=============== FILE: src/server.js ===============
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { typeDefs, resolvers } from './schema.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// INC-4502 (Meridian finding 2): strip the suggestion before a client sees it.
const SUGGESTION = /^Cannot query field ".+" on type ".+"\. Did you mean .+\?$/;

export function buildServer() {
  return new ApolloServer({
    typeDefs,
    resolvers,
    introspection: !IS_PRODUCTION,
    formatError: (formatted) =>
      SUGGESTION.test(formatted.message)
        ? { ...formatted, message: 'Bad request' }
        : formatted,
  });
}

export async function start() {
  const server = buildServer();
  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT ?? 4000) },
  });
  console.log(`parcelly-api ready at ${url}`);
}

=============== FILE: src/schema.js ===============
export const typeDefs = `#graphql
  enum ShipmentState {
    IN_TRANSIT
    DELIVERED
    RETURNED
  }

  type Customer {
    id: ID!
    customerEmail: String!
    shipmentCount: Int!
  }

  type Query {
    customer(id: ID!, includeArchived: Boolean): Customer
    shipments(state: ShipmentState!): [String!]!
    health: String!
  }
`;

const CUSTOMERS = {
  c_1: { id: 'c_1', customerEmail: 'ops@meridian.test', shipmentCount: 418 },
};

const SHIPMENTS = {
  IN_TRANSIT: ['s_9001'],
  DELIVERED: ['s_8817', 's_8820'],
  RETURNED: [],
};

export const resolvers = {
  Query: {
    customer: (_parent, { id }) => CUSTOMERS[id] ?? null,
    shipments: (_parent, { state }) => SHIPMENTS[state] ?? [],
    health: () => 'ok',
  },
};

=============== FILE: tests/schema.test.js ===============
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

=============== FILE: .github/workflows/graphql.yml ===============
name: graphql

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

=============== FILE: deploy/api.values.yaml ===============
# Corrected 2026-09-03. Read `NODE_ENV: prod` from the chart's first commit
# (2025-11-14) until that change.
image:
  repository: ghcr.io/parcelly/api
  tag: "2026.09.02"

env:
  NODE_ENV: production
  PORT: "4000"

resources:
  requests:
    cpu: 500m
    memory: 512Mi

=============== FILE: docs/client-traffic.md ===============
# Operations by client, 2026-08-25 to 2026-08-31

Source: gateway access logs, 41.2M operations.

| Client                     | Share | How queries are sent                    |
|----------------------------|-------|-----------------------------------------|
| web (parcelly.com)         | 62.0% | hashed, from the generated manifest     |
| parcelly-ios 3.2.x         | 31.4% | full query text, built at runtime       |
| partner integrations (~40) | 6.6%  | full query text, hand-written per tenant|

Notes:

- The manifest is generated by the web build. 3.6 is the first iOS build that
  sends manifest hashes; it is in TestFlight.
- Partner integrations write their own queries against our published schema.

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
