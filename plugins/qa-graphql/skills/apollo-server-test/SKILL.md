---
name: apollo-server-test
description: "Wraps Apollo Server testing patterns: `server.executeOperation()` (in-process, no HTTP), `supertest` against an ephemeral-port HTTP server (port 0), context injection via the `contextValue` second-argument, and assertion patterns for response shape + errors. Includes the production-config gates testable through this skill - introspection-disabled, persisted-query mode, hideSchemaDetailsFromClientErrors. Use when writing tests for an Apollo Server v4+ GraphQL service. Composes introspection-attack-surface-reference + persisted-query-strategy-reference for the production-safety assertions."
rating: 23
d6: 4
archetype: S1
---

# apollo-server-test

## Overview

Per
[apollographql.com/docs/apollo-server/testing/testing](https://www.apollographql.com/docs/apollo-server/testing/testing),
`executeOperation` "initializes automatically" - no startup
needed for unit-style tests against the schema in-process. For
HTTP-layer tests (CORS, middleware, response headers), use
`supertest` against an ephemeral-port server.

## When to use

- Unit tests for resolvers using `executeOperation`.
- Integration tests for HTTP-layer behaviour using `supertest`.
- Production-config gates: assert introspection / APQ /
  hideSchemaDetails configurations per
  [`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md).

## Authoring

### Install

```bash
npm install --save-dev @apollo/server supertest @types/supertest
```

### In-process tests with `executeOperation`

Per Apollo docs:

```typescript
import { ApolloServer } from '@apollo/server';
import { typeDefs, resolvers } from './schema';

const testServer = new ApolloServer({ typeDefs, resolvers });

test('returns greeting', async () => {
  const response = await testServer.executeOperation({
    query: 'query SayHelloWorld($name: String) { hello(name: $name) }',
    variables: { name: 'world' },
  });

  // Per Apollo docs: "Any errors in parsing, validating, and
  // executing your GraphQL operation are returned in the nested
  // `errors` field" rather than being thrown
  if (response.body.kind !== 'single') throw new Error('expected single');
  expect(response.body.singleResult.errors).toBeUndefined();
  expect(response.body.singleResult.data?.hello).toBe('Hello world!');
});
```

### Context injection (auth, datasources)

```typescript
const res = await testServer.executeOperation(
  { query: GET_LAUNCH, variables: { id: 1 } },
  {
    contextValue: {
      user: { id: 1, email: 'a@a.a' },
      dataSources: { userAPI, launchAPI },
    },
  },
);
```

Pass `contextValue` to bypass the production
context-initialisation function (which usually parses headers).

### HTTP-layer tests with supertest

Per Apollo docs:

```typescript
import { startStandaloneServer } from '@apollo/server/standalone';
import request from 'supertest';

let server: ApolloServer;
let url: string;

beforeAll(async () => {
  server = new ApolloServer({ typeDefs, resolvers });
  ({ url } = await startStandaloneServer(server, {
    listen: { port: 0 },   // OS picks port → parallel-test safe
  }));
});

afterAll(async () => {
  await server?.stop();
});

it('says hello over HTTP', async () => {
  const response = await request(url)
    .post('/')
    .send({ query: '{ hello }' });
  expect(response.status).toBe(200);
  expect(response.body.data?.hello).toBeDefined();
});
```

## Running

### Standard test commands

```bash
npm test                    # jest / vitest pick up *.test.ts
npx jest schema.test.ts -t "introspection"
```

### Production-config tests (most important)

Per
[`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md):

```typescript
import { ApolloServer } from '@apollo/server';

test('introspection disabled when production', async () => {
  process.env.NODE_ENV = 'production';
  const prodServer = new ApolloServer({
    typeDefs, resolvers,
    introspection: process.env.NODE_ENV !== 'production',
  });
  const resp = await prodServer.executeOperation({
    query: '{ __schema { types { name } } }',
  });
  if (resp.body.kind !== 'single') throw new Error('expected single');
  expect(resp.body.singleResult.errors).toBeDefined();
  expect(resp.body.singleResult.errors?.[0].message).toMatch(/introspection/i);
});

test('hideSchemaDetailsFromClientErrors strips did-you-mean', async () => {
  const server = new ApolloServer({
    typeDefs, resolvers,
    hideSchemaDetailsFromClientErrors: true,
  });
  const resp = await server.executeOperation({
    query: '{ usre { id } }',  // typo
  });
  if (resp.body.kind !== 'single') throw new Error('expected single');
  expect(JSON.stringify(resp.body.singleResult.errors)).not.toMatch(/did you mean/i);
});
```

### Persisted-query mode test

Per
[`persisted-query-strategy-reference`](../persisted-query-strategy-reference/SKILL.md)
Mode 2:

```typescript
test('strict APQ rejects unregistered hash', async () => {
  const server = new ApolloServer({
    typeDefs, resolvers,
    persistedQueries: false,  // turn off auto-register
    plugins: [/* strict-allowlist plugin from manifest */],
  });
  const { url } = await startStandaloneServer(server, { listen: { port: 0 } });

  const resp = await request(url).post('/').send({
    extensions: { persistedQuery: { version: 1, sha256Hash: 'deadbeef'.repeat(8) } },
  });
  expect(resp.body.errors[0].extensions.code).toMatch(/PERSISTED_QUERY/);
});
```

## Parsing results

Per Apollo docs, the `executeOperation` response shape is
discriminated:

```typescript
type ExecuteOperationResult =
  | { body: { kind: 'single'; singleResult: { data?: ...; errors?: ... } } }
  | { body: { kind: 'incremental'; ... } };
```

Always check `kind === 'single'` first. The errors array
contains `GraphQLError` objects with `message`, `path`,
`extensions.code` (e.g., `'BAD_USER_INPUT'`, `'UNAUTHENTICATED'`,
`'PERSISTED_QUERY_NOT_FOUND'`).

For supertest: standard HTTP response; `response.body.errors` if
GraphQL-level error, `response.status` if transport error.

## CI integration

```yaml
# .github/workflows/graphql-tests.yml
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
      - name: Production-config assertions
        env:
          NODE_ENV: production
        run: npx jest tests/production-config/ --forceExit
```

The production-config jobs run **separately** with
`NODE_ENV=production` so the actual prod-time defaults are
exercised.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Tests in `NODE_ENV=test` only | Production defaults differ; introspection-disabled gate untested | Separate prod-config test job |
| `executeOperation` for HTTP-layer concerns | Skips middleware, CORS, headers | Use supertest for HTTP-layer |
| Hardcoded port `4000` in tests | Parallel CI conflicts | `port: 0` |
| Forgetting `server.stop()` in `afterAll` | Goroutine / connection leak across tests | Always stop |
| Asserting `errors[0].message` string | Brittle to wording / i18n | Assert `extensions.code` |
| Skipping `contextValue` injection | Tests use real auth headers; flaky | Inject mocked context per test |
| One mega-test for the whole schema | Failures hard to diagnose | One test per resolver / operation |
| `data` access without checking `errors` | Errors masked; false positives | Check `errors === undefined` first |

## Limitations

- **`executeOperation` skips HTTP.** Auth via headers, CORS,
  rate-limiting middleware are not exercised. Use supertest for
  those.
- **Doesn't test subscriptions over WS.** Subscriptions need a
  WebSocket server; use `graphql-ws` test patterns.
- **Doesn't catch type-level bugs at runtime.** Test the runtime
  behaviour, not the type definitions. Compile-time errors are
  separate.
- **Doesn't replace contract tests.** Mocked context can drift
  from prod; pair with
  [`qa-contract-testing/graphql-schema-regression`](../../../qa-contract-testing/skills/graphql-schema-regression/SKILL.md).

## References

- Apollo Server testing docs:
  [apollographql.com/docs/apollo-server/testing/testing](https://www.apollographql.com/docs/apollo-server/testing/testing).
- Apollo Server API reference:
  [apollographql.com/docs/apollo-server/api/apollo-server](https://www.apollographql.com/docs/apollo-server/api/apollo-server).
- Companion catalogs:
  [`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md),
  [`persisted-query-strategy-reference`](../persisted-query-strategy-reference/SKILL.md).
- Sibling frameworks:
  [`graphql-yoga-test`](../graphql-yoga-test/SKILL.md),
  [`hasura-test`](../hasura-test/SKILL.md),
  [`mercurius-test`](../mercurius-test/SKILL.md),
  [`pothos-builder-tests`](../pothos-builder-tests/SKILL.md).
- N+1 detection (consumer):
  [`n-plus-one-query-detector`](../../agents/n-plus-one-query-detector.md).
- Contract-drift cross-plugin:
  [`qa-contract-testing/graphql-schema-regression`](../../../qa-contract-testing/skills/graphql-schema-regression/SKILL.md).
