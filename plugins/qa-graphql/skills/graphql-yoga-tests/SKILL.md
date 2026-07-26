---
name: graphql-yoga-tests
description: "Wraps GraphQL Yoga (the-guild.dev runtime) testing patterns: `yoga.fetch()` for in-process HTTP-conformant request simulation with no network, `@graphql-tools/executor-http` for subscription and incremental-delivery testing, the request-builder pattern for queries/mutations, and Yoga config gates plugin-disable-introspection and plugin-persisted-operations. Use for a Yoga server; for a different runtime harness use apollo-server-tests, mercurius-tests, or hasura-tests instead, not this skill."
---

# graphql-yoga-tests

## Overview

Per
[the-guild.dev/graphql/yoga-server/docs/features/testing](https://the-guild.dev/graphql/yoga-server/docs/features/testing):
"Calling the `yoga.fetch` method does not send an actual HTTP
request. It simulates the HTTP request which 100% conforms with
how Request/Response work."

Structurally different from Apollo's `executeOperation` - Yoga's
testing path goes through the HTTP transport layer including
middleware, headers, and response codes. There is no separate
"in-process" vs "HTTP-layer" choice.

## When to use

- Unit / integration tests for a Yoga-based GraphQL server.
- Subscription tests (SSE / WS via Yoga).
- Production-config gates for Yoga's plugin-based controls.

## How to use

1. Install `graphql-yoga` and `@graphql-tools/executor-http`.
2. Build the server in the test file (or `beforeAll`) with `createYoga({ schema })`;
   no HTTP listener is started.
3. For queries / mutations, call `yoga.fetch('http://yoga/graphql', { method: 'POST', ... })`
   with a parseable placeholder URL and read `.json()`.
4. For subscriptions / incremental delivery, wrap `yoga.fetch` in `buildHTTPExecutor`
   and iterate the returned async stream.
5. Exercise auth by passing an `Authorization` header so Yoga's context-builder runs
   against the simulated request.
6. Mirror the production plugin set (disable-introspection, persisted-operations strict
   mode) in a production-config test file.
7. Run `npm test` locally and a separate `NODE_ENV=production` job in CI for the
   production-config tests.

## Authoring

### Install

```bash
npm install --save-dev graphql-yoga @graphql-tools/executor-http
```

### Basic test

Per Yoga docs:

```typescript
import { createYoga, createSchema } from 'graphql-yoga';

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query { greetings: String }
    `,
    resolvers: { Query: { greetings: () => 'Hello' } },
  }),
});

test('greetings', async () => {
  const response = await yoga.fetch('http://yoga/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ greetings }' }),
  });
  const result = await response.json();
  expect(result.data.greetings).toBe('Hello');
});
```

The URL `http://yoga/graphql` is a placeholder - `yoga.fetch`
doesn't make a network call, but the URL must parse.

### HTTP executor for subscriptions

Per Yoga docs:

```typescript
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { parse } from 'graphql';

const executor = buildHTTPExecutor({ fetch: yoga.fetch });
const result = await executor({ document: parse(`{ greetings }`) });
expect(result.data.greetings).toBe('Hello');
```

For subscriptions (SSE):

```typescript
const stream = await executor({ document: parse(subscriptionQuery) });
if (Symbol.asyncIterator in stream) {
  for await (const event of stream) {
    expect(event.data).toBeDefined();
    if (allEventsReceived) break;
  }
}
```

### Auth header pass-through

```typescript
const response = await yoga.fetch('http://yoga/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testToken}`,
  },
  body: JSON.stringify({ query: '{ me { id } }' }),
});
```

Yoga's context-builder runs against the simulated request, so
auth middleware is exercised.

## Worked example

Scenario: verify a `{ me { id } }` query requires a bearer token, and that
introspection is off in the production plugin set.

1. Build the server with `createYoga({ schema, plugins: [useDisableIntrospection()] })`
   and a context-builder that reads `Authorization`.
2. `yoga.fetch` `{ me { id } }` with no header; parse `.json()` and assert
   `result.errors` is present - the context / auth middleware rejected it.
3. `yoga.fetch` the same query with `Authorization: Bearer ${testToken}`; assert
   `result.data.me.id` is returned.
4. `yoga.fetch` an `{ __schema { types { name } } }` query; assert
   `result.errors[0].message` matches `/introspection/i`.

Result: one file proves auth pass-through (tokenless rejected, valid token
resolves) and the production introspection gate in-process, no network.

## Running

### Standard test commands

```bash
npm test
```

### Production-config tests

Yoga's production gates - disable-introspection and persisted-operations - have
their own plugin setup and strict-mode assertions. Full test patterns are in
[references/production-config-tests.md](references/production-config-tests.md).

## Parsing results

`yoga.fetch` returns a standard `Response`. Parse with `.json()`
for non-streaming queries; iterate with the async-iterator for
subscriptions.

The response shape:

```json
{
  "data": { "greetings": "Hello" },
  "errors": [
    {
      "message": "...",
      "path": ["greetings"],
      "extensions": { "code": "..." }
    }
  ]
}
```

Yoga uses `useMaskedErrors` by default (per Yoga docs) - error
messages are masked to "Unexpected error" in production unless
the error has been marked `safe`. Test against this:

```typescript
const resp = await yoga.fetch(/* ... */);
const result = await resp.json();
// Production: error message is "Unexpected error", original
// hidden in extensions if at all
expect(result.errors[0].message).toBe('Unexpected error.');
```

## CI integration

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test
      - name: Production-mode tests
        env: { NODE_ENV: production }
        run: npx jest tests/production-config/
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skipping `yoga.fetch` and using HTTP server directly | Slower; same coverage | `yoga.fetch` is purpose-built |
| Asserting on Yoga's default error string `"Unexpected error."` everywhere | Misses real errors that aren't masked | Use `useMaskedErrors({ errorMessage: 'Sanitised' })` and assert per-test |
| Skipping `useDisableIntrospection` in prod tests | Production introspection silently enabled | Mirror prod plugin set in test |
| Persisted-operations plugin without explicit `allowArbitraryOperations: false` | Auto-bypass on unrecognised hash | Use strict mode |
| Subscription tests with `await response.json()` | SSE/multipart streams aren't JSON | Use `buildHTTPExecutor` + async iterator |
| Stale schema in test | Schema drifts; tests pass against old shape | Rebuild schema per test file or use `beforeAll` |

## Limitations

- **No real HTTP server.** Tests that depend on the underlying
  HTTP framework's behaviour (e.g., Node `http` quirks, h2-upgrade
  scenarios) need a real server with `node-fetch` or `supertest`.
- **Subscription transports.** Yoga supports SSE by default;
  WebSocket subscriptions need `graphql-ws` integration with its
  own test harness.
- **Error masking complexity.** `useMaskedErrors` interacts with
  every test that asserts on errors; understand the project's
  configuration.
- **File uploads.** Yoga's multipart-upload spec testing needs
  `FormData` not JSON.

## References

- Yoga testing docs:
  [the-guild.dev/graphql/yoga-server/docs/features/testing](https://the-guild.dev/graphql/yoga-server/docs/features/testing).
- Disable-introspection plugin:
  [the-guild.dev/graphql/yoga-server/docs](https://the-guild.dev/graphql/yoga-server/docs).
- Companion catalogs:
  `introspection-attack-surface-reference`,
  `persisted-query-strategy-reference`.
- Sibling frameworks:
  `apollo-server-tests`,
  `mercurius-tests`,
  `pothos-builder-tests`.
