# Sarah has a one-line fix for Monday and I have to answer it by Thursday

## Problem Description

We moved the web app from `parcelly.com` to `app.parcelly.com` on Monday
2026-09-08. Within four minutes support had eleven tickets - the page loads, the
spinner never stops, and the browser console is red - and we rolled the DNS back
at 09:51. The edge log for the window is attached. Nothing was wrong with the
API: every request our servers saw was answered, which is why it took us until
09:44 to work out what had happened.

Sarah's read is that keeping a hand-written list of origins in a source file is
the actual defect, and she has pushed a branch that replaces it with a pattern
for the domain - `ci/sarah-proposal.diff` is the change. Her argument is that it
is one line, that subdomains then just work, that it is the only version of this
that cannot go stale, and that we have now spent two outages and most of a
Monday on a list a pattern would have covered. She is raising it in the platform
review on Thursday and I would rather not improvise, so I want a straight answer
on that branch in writing.

When I asked the API team how Monday got past CI, I was pointed at
`tests/cors.test.js`, four tests, all green, all in the blocking path. Read them
and tell me whether any of them could have gone red on Monday morning. Those
four are being cited in the incident review as evidence that the change was
tested and I do not think they are that.

The other thing I want dealt with while you are in here is
`tests/http.test.js`. It is the only test that starts the server for real and it
has made the job unreliable for weeks - the CI excerpt is attached, and we run
four jobs per runner. Nobody looks at that job any more, which is part of how
Monday happened.

What I care about at the end of this is that the next time someone edits that
configuration, something goes red before a browser tells us. The lockfile is
frozen until the Node 22 bump lands, so whatever you write has to work with what
is already in `package.json`.

## Output Specification

1. Make sure `https://app.parcelly.com` can talk to the API.
2. Give Sarah a written answer, and take her branch if you agree with it.
3. Add coverage that goes red if the endpoint stops accepting a browser request
   from an allowed origin, and goes red if it starts accepting one from an
   origin that is not allowed.
4. Write `docs/cors-coverage.md`: your answer to Sarah, and for each of the four
   tests in `tests/cors.test.js`, what it actually exercises and whether it
   could have caught Monday.
5. The graphql job has to finish on its own and stop colliding with the other
   jobs on the runner. Total suite runtime stays under a minute.

## Input Files

Extract the following files before beginning.

=============== FILE: src/cors-options.js ===============
export const allowedOrigins = [
  'https://parcelly.com',
  'https://admin.parcelly.com',
];

export const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['content-type', 'authorization'],
};

=============== FILE: ci/sarah-proposal.diff ===============
commit 1f0c93a  sarah.mbeki  2026-09-09 18:22
    cors: match the domain instead of listing every host

diff --git a/src/cors-options.js b/src/cors-options.js
@@
 export const corsOptions = {
-  origin: allowedOrigins,
+  origin: /\.parcelly\.com$/,
   credentials: true,
   methods: ['POST', 'OPTIONS'],
   allowedHeaders: ['content-type', 'authorization'],
 };

# npm test on the branch: 5 passing, 0 failing.

=============== FILE: src/schema.js ===============
export const typeDefs = `#graphql
  type Shipment {
    id: ID!
    status: String!
  }

  type Query {
    health: String!
    shipment(id: ID!): Shipment
  }
`;

export const resolvers = {
  Query: {
    health: () => 'ok',
    shipment: (_parent, { id }) => ({ id, status: 'in_transit' }),
  },
};

=============== FILE: src/app.js ===============
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import { typeDefs, resolvers } from './schema.js';
import { corsOptions } from './cors-options.js';

export async function buildApp() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  const app = express();
  app.use(
    '/graphql',
    cors(corsOptions),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ origin: req.headers.origin }),
    }),
  );

  return { app, server };
}

=============== FILE: tests/cors.test.js ===============
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

=============== FILE: tests/http.test.js ===============
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

=============== FILE: ci/edge-log-2026-09-08.txt ===============
# api.parcelly.com edge log, 09:46:58 - 09:47:12 UTC, filtered to /graphql
# columns: time method path status bytes origin

09:46:58  OPTIONS  /graphql  204  0      https://parcelly.com
09:46:58  POST     /graphql  200  1483   https://parcelly.com
09:47:01  OPTIONS  /graphql  204  0      https://app.parcelly.com
09:47:02  OPTIONS  /graphql  204  0      https://app.parcelly.com
09:47:02  OPTIONS  /graphql  204  0      https://app.parcelly.com
09:47:04  OPTIONS  /graphql  204  0      https://parcelly.com
09:47:04  POST     /graphql  200  2210   https://parcelly.com
09:47:06  OPTIONS  /graphql  204  0      https://app.parcelly.com
09:47:09  OPTIONS  /graphql  204  0      https://app.parcelly.com
09:47:12  OPTIONS  /graphql  204  0      https://app.parcelly.com

# window totals, 09:12 - 09:51
#   origin=https://parcelly.com        2,904 OPTIONS   2,904 POST
#   origin=https://admin.parcelly.com     61 OPTIONS      61 POST
#   origin=https://app.parcelly.com    4,118 OPTIONS       0 POST
#   status 2xx 9,983   status 3xx 0   status 4xx 0   status 5xx 0
# 09:51 DNS rolled back to parcelly.com.

=============== FILE: ci/run-2026-09-09.log ===============
# graphql job, last 10 runs on main

run 4471  ok      11m 04s
run 4470  ok      11m 02s
run 4469  FAIL     0m 38s   Error: listen EADDRINUSE: address already in use :::4000
run 4468  ok      11m 03s
run 4467  FAIL     0m 41s   Error: listen EADDRINUSE: address already in use :::4000
run 4466  ok      11m 05s
run 4465  ok      11m 02s
run 4464  FAIL     0m 36s   Error: listen EADDRINUSE: address already in use :::4000
run 4463  ok      11m 01s
run 4462  ok      11m 06s

--- tail of run 4471 ---
> parcelly-api@ test
> node --test tests/

# tests 5
# suites 0
# pass 5
# fail 0
# duration_ms 412.88

Error: The operation was canceled.

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
    "body-parser": "^1.20.3",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "graphql": "^16.9.0"
  }
}
