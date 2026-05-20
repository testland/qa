---
name: graphql-yoga-test
description: "Wraps GraphQL Yoga testing patterns: `yoga.fetch()` for in-process HTTP-conformant request simulation (no network), `@graphql-tools/executor-http` for subscription + incremental-delivery testing, and the request-builder pattern for queries/mutations/subscriptions. Includes Yoga-specific config gates — `@graphql-yoga/plugin-disable-introspection`, `@graphql-yoga/plugin-persisted-operations` — testable through this skill. Use when writing tests for a GraphQL Yoga server (the-guild.dev's runtime, common in non-Apollo deployments). Composes introspection-attack-surface-reference + persisted-query-strategy-reference."
rating: 22
d6: 4
archetype: S1
---

# graphql-yoga-test

## Overview

GraphQL Yoga is the-guild.dev's GraphQL server runtime. Its
testing model uses `yoga.fetch()` — per
[the-guild.dev/graphql/yoga-server/docs/features/testing](https://the-guild.dev/graphql/yoga-server/docs/features/testing):
"Calling the `yoga.fetch` method does not send an actual HTTP
request. It simulates the HTTP request which 100% conforms with
how Request/Response work."

This is structurally different from Apollo's `executeOperation` —
Yoga's testing path goes through the HTTP transport layer
including middleware, headers, and response codes. There is no
separate "in-process" vs "HTTP-layer" choice.

## When to use

- Unit / integration tests for a Yoga-based GraphQL server.
- Subscription tests (SSE / WS via Yoga).
- Production-config gates for Yoga's plugin-based controls.

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

The URL `http://yoga/graphql` is a placeholder — `yoga.fetch`
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

## Running

### Standard test commands

```bash
npm test
```

### Production-config tests

Per
[`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md):

```typescript
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection';

test('introspection disabled', async () => {
  const yoga = createYoga({
    schema,
    plugins: [useDisableIntrospection()],
  });
  const resp = await yoga.fetch('http://yoga/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ __schema { types { name } } }' }),
  });
  const result = await resp.json();
  expect(result.errors).toBeDefined();
  expect(result.errors[0].message).toMatch(/introspection/i);
});
```

### Persisted-operations test

Per
[`persisted-query-strategy-reference`](../persisted-query-strategy-reference/SKILL.md)
Mode 2:

```typescript
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';

const operations = {
  'abcdef': '{ greetings }',
};

test('rejects unregistered hash in strict mode', async () => {
  const yoga = createYoga({
    schema,
    plugins: [
      usePersistedOperations({
        getPersistedOperation: (key) => operations[key],
      }),
    ],
  });
  const resp = await yoga.fetch('http://yoga/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      extensions: {
        persistedQuery: { version: 1, sha256Hash: 'unknown' },
      },
    }),
  });
  expect(resp.status).toBe(404);  // Yoga's default for unknown
});
```

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

Yoga uses `useMaskedErrors` by default (per Yoga docs) — error
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
  [`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md),
  [`persisted-query-strategy-reference`](../persisted-query-strategy-reference/SKILL.md).
- Sibling frameworks:
  [`apollo-server-test`](../apollo-server-test/SKILL.md),
  [`mercurius-test`](../mercurius-test/SKILL.md),
  [`pothos-builder-tests`](../pothos-builder-tests/SKILL.md).
- N+1 detection:
  [`n-plus-one-query-detector`](../../agents/n-plus-one-query-detector.md).
