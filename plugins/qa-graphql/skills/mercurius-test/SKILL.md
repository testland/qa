---
name: mercurius-test
description: "Wraps Mercurius (Fastify GraphQL plugin) testing patterns: `app.inject()` for HTTP-layer simulation without spinning up a network listener, plugin-registration setup (await app.register(mercurius, { schema, resolvers, graphiql: false })), production-config gates (graphiql: false; jit threshold; query depth limits via fastify-rate-limit + complexity), and the per-test app lifecycle (app.close() in afterEach). Use when writing tests for a Fastify + Mercurius GraphQL server. Composes introspection-attack-surface-reference for the production-safety gates."
rating: 22
d6: 4
archetype: S1
---

# mercurius-test

## Overview

Mercurius is a GraphQL plugin for Fastify. Its testing path uses
`app.inject()` — Fastify's built-in HTTP-layer simulator that
runs requests through the full middleware stack without binding
a port.

Per [github.com/mercurius-js/mercurius](https://github.com/mercurius-js/mercurius/blob/master/README.md),
the plugin is registered as `await app.register(mercurius, {
schema, resolvers })`. Tests then submit POSTs via
`app.inject()`.

## When to use

- Unit / integration tests for a Mercurius-based GraphQL server.
- Production-config gates: graphiql disabled, depth limits.
- Fastify-specific middleware behaviour (auth, rate-limit,
  CORS).

## Authoring

### Install

```bash
npm install --save-dev fastify mercurius
```

### Basic test

```typescript
import Fastify from 'fastify';
import mercurius from 'mercurius';

function buildApp() {
  const app = Fastify();
  app.register(mercurius, {
    schema: `type Query { add(x: Int, y: Int): Int }`,
    resolvers: {
      Query: {
        add: async (_, { x, y }) => x + y,
      },
    },
    graphiql: false,  // disable GraphiQL UI in tests
  });
  return app;
}

test('add', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/graphql',
    payload: { query: '{ add(x: 2, y: 3) }' },
  });
  expect(response.statusCode).toBe(200);
  const body = JSON.parse(response.body);
  expect(body.data.add).toBe(5);
  await app.close();
});
```

Per the README's quickstart pattern, plugin registration takes
`schema` + `resolvers`. The test pattern is `inject` then `close`.

### Auth header tests

```typescript
const response = await app.inject({
  method: 'POST',
  url: '/graphql',
  headers: { authorization: `Bearer ${testToken}` },
  payload: { query: '{ me { id } }' },
});
```

Headers go through Fastify's middleware (e.g., `fastify-jwt`)
exactly as in production.

### Per-test app lifecycle

```typescript
let app: ReturnType<typeof buildApp>;

beforeEach(() => { app = buildApp(); });
afterEach(async () => { await app.close(); });
```

Per Fastify convention: rebuild + close per test to avoid plugin
state contamination.

## Running

```bash
npm test
```

### Production-config tests

Per
[`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md):

```typescript
test('graphiql disabled in production config', async () => {
  const app = Fastify();
  app.register(mercurius, {
    schema, resolvers,
    graphiql: false,
  });
  const resp = await app.inject({ method: 'GET', url: '/graphiql' });
  expect(resp.statusCode).toBe(404);
  await app.close();
});

test('introspection disabled', async () => {
  // Mercurius doesn't have a direct introspection flag; use
  // mercurius-validation or a custom validator that rejects
  // introspection AST nodes
  const app = Fastify();
  app.register(mercurius, {
    schema, resolvers,
    graphiql: false,
    validationRules: [rejectIntrospectionRule],
  });
  const resp = await app.inject({
    method: 'POST',
    url: '/graphql',
    payload: { query: '{ __schema { types { name } } }' },
  });
  const body = JSON.parse(resp.body);
  expect(body.errors).toBeDefined();
  await app.close();
});
```

### Query-complexity / depth limiting

Use `graphql-validation-complexity` or `graphql-depth-limit` as a
validation rule passed via Mercurius config:

```typescript
import depthLimit from 'graphql-depth-limit';

app.register(mercurius, {
  schema, resolvers,
  graphiql: false,
  validationRules: [depthLimit(5)],
});
```

Test:

```typescript
test('depth limit', async () => {
  const deep = '{ user { friends { friends { friends { friends { friends { id }}}}}}}';
  const resp = await app.inject({ method: 'POST', url: '/graphql', payload: { query: deep } });
  const body = JSON.parse(resp.body);
  expect(body.errors[0].message).toMatch(/maximum operation depth/i);
});
```

## Parsing results

`app.inject()` returns a Light My Request response:

```typescript
{
  statusCode: 200,
  body: '{"data":...}',   // string, not parsed
  headers: { ... },
  payload: '{"data":...}', // alias for body
}
```

Always `JSON.parse(response.body)` for GraphQL responses.

The GraphQL response shape is standard:

```json
{
  "data": { ... },
  "errors": [{ "message": "...", "path": [...], "extensions": {...} }]
}
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
```

For multi-process / cluster-mode tests, Fastify's `inject` won't
exercise cluster behaviour — use a real `app.listen({ port: 0 })`
for those cases.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `graphiql: true` in production code path | Schema disclosure via GraphiQL | Always `graphiql: false` in prod; gate per env |
| Sharing one `app` across tests | Plugin state leaks; mutations persist | Per-test `buildApp` + `close` |
| Skipping `await app.close()` | Fastify keep-alive timers leak; CI hangs | Always close |
| `app.inject` with `body` field | Should be `payload`; Fastify ignores `body` here | Use `payload` |
| Asserting on `response.payload` for non-JSON content | Buffer / stream responses need different handling | Inspect `headers['content-type']` first |
| No depth / complexity validation | Mercurius doesn't add these by default | Add `validationRules` per [`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md) |
| Testing on real listening port | Slower; flaky parallel CI | `app.inject` is purpose-built |
| Mocking the schema instead of using it | Tests pass against a fake schema, not the real one | Always test the real schema |

## Limitations

- **No subscription support in `inject`.** Mercurius subscriptions
  use WebSockets; tests need a real `listen` + `ws` client.
- **JIT compilation off in test.** Mercurius supports JIT via
  `jit: 1` (compile after 1 invocation); the prod JIT path may
  optimise differently than tests.
- **No introspection-disable flag.** Have to roll custom
  validation rules; not as ergonomic as Apollo's
  `introspection: false`.
- **Fastify plugin order matters.** `auth` plugin must register
  before `mercurius`; test setup must match prod order or auth
  doesn't apply.

## References

- Mercurius README:
  [github.com/mercurius-js/mercurius](https://github.com/mercurius-js/mercurius/blob/master/README.md).
- Mercurius API options:
  [github.com/mercurius-js/mercurius/blob/master/docs/api/options.md](https://github.com/mercurius-js/mercurius/blob/master/docs/api/options.md).
- Fastify inject (Light My Request):
  [fastify.dev/docs/latest/Guides/Testing/](https://fastify.dev/docs/latest/Guides/Testing/).
- Companion catalog:
  [`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md).
- Sibling frameworks:
  [`apollo-server-test`](../apollo-server-test/SKILL.md),
  [`graphql-yoga-test`](../graphql-yoga-test/SKILL.md),
  [`hasura-test`](../hasura-test/SKILL.md),
  [`pothos-builder-tests`](../pothos-builder-tests/SKILL.md).
