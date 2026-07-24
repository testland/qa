---
name: graphql-subscription-test-author
description: "Authors test suites for GraphQL subscription resolvers over graphql-ws (WebSocket) and graphql-sse (Server-Sent Events) transports: subscribe to event streams with the async-iterator API, assert emitted data shape and sequence, verify connection lifecycle (connect, auth rejection, graceful close, protocol close codes), validate auth-on-connect via connectionParams / authenticate callback, and test resolver-level pubsub trigger logic in isolation. Use when writing tests for subscription operations - as distinct from query/mutation tests covered by apollo-server-tests, graphql-yoga-tests, or mercurius-tests."
---

# graphql-subscription-test-author

## Overview

Per the GraphQL October 2021 spec (section 6.3, blocked by Cloudflare
Turnstile - cite by stable ID "GraphQL October 2021 spec, Section 6.3:
Subscription"), a subscription operation must: select a single root field,
return an event stream, and emit one result per event. Each emitted result
is executed independently against the schema, exactly like a query.

This skill covers testing the transport and resolver layers for subscriptions.
The two most common Node.js transports are:

- **graphql-ws** - WebSocket subprotocol `"graphql-ws"` (per
  [the-guild.dev/graphql/ws](https://the-guild.dev/graphql/ws))
- **graphql-sse** - HTTP Server-Sent Events (per
  [the-guild.dev/graphql/sse](https://the-guild.dev/graphql/sse))

Both expose an identical async-iterator surface via `client.iterate()`,
making the same test patterns portable across transports.

## When to use

- Writing tests for subscription resolvers (pubsub trigger, filter, error).
- Asserting connection lifecycle: handshake, auth rejection, protocol close.
- Verifying auth-on-connect: `connectionParams` (WS) or `authenticate`
  callback (SSE) reject unauthenticated clients before any event is sent.
- Integration-testing that event-stream shape matches the schema contract.

Distinct scope vs. sibling skills:

- `apollo-server-tests` covers queries/mutations via `executeOperation`;
  its Limitations section explicitly notes "Doesn't test subscriptions
  over WS."
- `graphql-yoga-tests` covers Yoga's `yoga.fetch()` path; subscription
  tests there go through Yoga's own plugin hooks, not graphql-ws/sse
  directly.
- `mercurius-tests` and `hasura-tests` target those specific runtimes.

## Authoring

### Install

```bash
# WS transport
npm install --save-dev graphql-ws ws @types/ws

# SSE transport
npm install --save-dev graphql-sse

# Shared test utilities
npm install --save-dev graphql jest ts-jest
```

### Server setup (graphql-ws over ws)

Per [the-guild.dev/graphql/ws/get-started](https://the-guild.dev/graphql/ws/get-started):

```typescript
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws';
import { schema } from './schema';

export function startWsServer(port = 0) {
  const wss = new WebSocketServer({ port });
  const dispose = useServer({ schema }, wss);
  return { wss, dispose };
}
```

Use `port: 0` so the OS assigns a free port - parallel-test safe.

### Server setup (graphql-sse over Node http)

Per [the-guild.dev/graphql/sse/get-started](https://the-guild.dev/graphql/sse/get-started):

```typescript
import { createServer } from 'http';
import { createHandler } from 'graphql-sse/lib/use/http';
import { schema } from './schema';

export function startSseServer() {
  const handler = createHandler({ schema });
  const server = createServer((req, res) => {
    if (req.url === '/graphql/stream') return handler(req, res);
    res.writeHead(404).end();
  });
  server.listen(0);
  const { port } = server.address() as { port: number };
  return { server, url: `http://localhost:${port}/graphql/stream` };
}
```

### Basic subscription test (graphql-ws)

Per [the-guild.dev/graphql/ws/get-started](https://the-guild.dev/graphql/ws/get-started):
both queries and subscriptions use `client.iterate()`, which returns an
async iterator.

```typescript
import { createClient } from 'graphql-ws';

describe('greetings subscription', () => {
  let wss: ReturnType<typeof startWsServer>;
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    wss = startWsServer();
    const addr = wss.wss.address() as { port: number };
    client = createClient({ url: `ws://localhost:${addr.port}/graphql` });
  });

  afterAll(async () => {
    client.dispose();
    await wss.dispose();
    wss.wss.close();
  });

  it('streams three greetings then completes', async () => {
    const results: unknown[] = [];
    const sub = client.iterate({ query: 'subscription { greetings }' });

    for await (const event of sub) {
      results.push(event.data);
      if (results.length === 3) break; // break closes the stream
    }

    expect(results).toEqual([
      { greetings: 'Hi' },
      { greetings: 'Bonjour' },
      { greetings: 'Hola' },
    ]);
  });
});
```

### Basic subscription test (graphql-sse)

Per [the-guild.dev/graphql/sse/get-started](https://the-guild.dev/graphql/sse/get-started):

```typescript
import { createClient } from 'graphql-sse';

it('receives events over SSE', async () => {
  const { server, url } = startSseServer();
  const client = createClient({ url });

  const results: unknown[] = [];
  const sub = client.iterate({ query: 'subscription { greetings }' });

  for await (const event of sub) {
    results.push(event.data);
    if (results.length === 1) break;
  }

  expect(results[0]).toEqual({ greetings: 'Hi' });
  server.close();
});
```

### Auth on connect (graphql-ws)

Per [the-guild.dev/graphql/ws/recipes](https://the-guild.dev/graphql/ws/recipes),
`onConnect` returns `false` to close with code `4403: Forbidden`:

```typescript
// Server
useServer(
  {
    schema,
    onConnect: async (ctx) => {
      if (!(await isTokenValid(ctx.connectionParams?.token))) {
        return false; // closes with 4403
      }
    },
  },
  wss,
);

// Test: reject missing token
it('closes with 4403 when token absent', (done) => {
  const badClient = createClient({
    url: `ws://localhost:${port}/graphql`,
    connectionParams: {}, // no token
    retryAttempts: 0,
    on: {
      closed: (event) => {
        expect((event as CloseEvent).code).toBe(4403);
        done();
      },
    },
  });
  badClient.subscribe({ query: 'subscription { greetings }' }, {
    next: () => {},
    error: () => {},
    complete: () => {},
  });
});

// Test: accept valid token
it('receives events when token valid', async () => {
  const authedClient = createClient({
    url: `ws://localhost:${port}/graphql`,
    connectionParams: { token: 'valid-token' },
  });
  const sub = authedClient.iterate({ query: 'subscription { greetings }' });
  const { value } = await sub.next();
  expect(value?.data).toBeDefined();
  authedClient.dispose();
});
```

Per [the-guild.dev/graphql/ws/recipes](https://the-guild.dev/graphql/ws/recipes),
`connectionParams` supports async factories for token refresh:

```typescript
const client = createClient({
  url: 'ws://localhost:4000/graphql',
  connectionParams: async () => ({ token: await getAccessToken() }),
  on: {
    closed: (event) => {
      if ((event as CloseEvent).code === 4403) scheduleTokenRefresh();
    },
  },
});
```

### Auth on connect (graphql-sse)

Per [the-guild.dev/graphql/sse/recipes](https://the-guild.dev/graphql/sse/recipes),
the `authenticate` callback on `createHandler` returns `[null, response]`
to reject:

```typescript
const handler = createHandler({
  schema,
  authenticate: async (req) => {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isTokenValid(token))) {
      return [null, { status: 401, statusText: 'Unauthorized' }];
    }
    return token;
  },
});

it('rejects unauthenticated SSE connections with 401', async () => {
  const client = createClient({
    url,
    headers: () => ({ authorization: 'Bearer bad-token' }),
  });
  const sub = client.iterate({ query: 'subscription { greetings }' });
  await expect(sub.next()).rejects.toMatchObject({ message: /401/ });
});
```

### Connection lifecycle assertions (graphql-ws)

Per [the-guild.dev/graphql/ws/docs](https://the-guild.dev/graphql/ws/docs),
the `on` option in `ClientOptions` accepts event-keyed callbacks. Protocol
close codes are defined by the graphql-ws spec:

| Code | Meaning |
|------|---------|
| 4400 | Bad request / invalid message |
| 4401 | Unauthorized (no `ConnectionInit` before timeout) |
| 4403 | Forbidden (server `onConnect` returned false) |
| 4408 | Connection initialisation timeout |
| 4409 | Subscriber already exists for that `id` |
| 4429 | Too many initialisation requests |

```typescript
const events: string[] = [];
const client = createClient({
  url,
  connectionParams: { token: 'valid' },
  on: {
    connecting: () => events.push('connecting'),
    connected:  () => events.push('connected'),
    closed:     () => events.push('closed'),
    error:      () => events.push('error'),
  },
});

const sub = client.iterate({ query: 'subscription { greetings }' });
await sub.next();      // wait for first event - connection must be open
await sub.return?.();  // graceful close via iterator return

// Allow close event to fire
await new Promise((r) => setTimeout(r, 50));
expect(events).toEqual(['connecting', 'connected', 'closed']);
```

### Resolver-level pubsub test

Isolate the resolver's pubsub wiring without a full transport stack using
the `graphql` `subscribe` function directly:

```typescript
import { subscribe, parse } from 'graphql';
import { schema, pubsub } from './schema';

it('resolver emits events published to the channel', async () => {
  const result = await subscribe({
    schema,
    document: parse('subscription { messageAdded { id text } }'),
  });

  if ('errors' in result) throw new Error('Subscription failed');

  // Publish after subscribing
  pubsub.publish('MESSAGE_ADDED', { messageAdded: { id: '1', text: 'hello' } });

  const { value } = await result.next();
  expect(value.data).toEqual({ messageAdded: { id: '1', text: 'hello' } });

  await result.return?.(); // clean up iterator
});
```

This tests the resolver in isolation - no WebSocket server, no client
library. Pair with transport-layer tests for full coverage.

### Event-sequence and filter tests

```typescript
it('only emits events that pass the filter predicate', async () => {
  const sub = client.iterate({
    query: 'subscription Messages($channel: String!) { messageAdded(channel: $channel) { text } }',
    variables: { channel: 'team-a' },
  });

  pubsub.publish('MESSAGE_ADDED', { channel: 'team-b', messageAdded: { text: 'wrong' } });
  pubsub.publish('MESSAGE_ADDED', { channel: 'team-a', messageAdded: { text: 'right' } });

  const { value } = await sub.next();
  expect(value.data?.messageAdded?.text).toBe('right');
  await sub.return?.();
});
```

### Error propagation tests

Per [the-guild.dev/graphql/sse/recipes](https://the-guild.dev/graphql/sse/recipes),
resolver errors during a subscription should surface via the iterator, not
crash the server:

```typescript
it('surfaces resolver errors as GraphQL errors, not exceptions', async () => {
  const result = await subscribe({
    schema: errorSchema, // schema whose subscription resolver throws
    document: parse('subscription { failingFeed }'),
  });

  if ('errors' in result) throw new Error('Subscribe itself failed');

  const { value } = await result.next();
  expect(value.errors).toBeDefined();
  expect(value.errors?.[0].message).toMatch(/expected error/i);
});
```

## Running

```bash
npm test                         # jest / vitest pick up *.test.ts
npx jest subscriptions/ --verbose
```

Set a `testTimeout` for subscriptions - default 5 s is tight when the
event loop needs to process WS frames:

```typescript
// jest.config.ts
export default { testTimeout: 15_000 };
```

## Parsing results

Both `graphql-ws` and `graphql-sse` `client.iterate()` yield objects shaped
`{ data?: T; errors?: GraphQLError[] }`. Check `errors` before asserting
`data`:

```typescript
const { value } = await sub.next();
expect(value.errors).toBeUndefined();
expect(value.data?.greetings).toBeDefined();
```

For the `graphql` package's `subscribe()` function, the iterator yields
`ExecutionResult` objects. Multipart/incremental results are separate from
standard subscription results.

## CI integration

```yaml
# .github/workflows/graphql-subscription-tests.yml
name: graphql-subscriptions
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
      - run: npx jest subscriptions/ --forceExit --testTimeout=15000
```

`--forceExit` prevents Jest from hanging on open WS connections if a test
fails before `dispose()` or `close()` is called.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hardcoded `ws://localhost:4000` | Port conflicts in parallel CI | `port: 0`, read back the OS-assigned port |
| No `dispose()` / `close()` in `afterAll` | Open WS/SSE connections prevent Jest from exiting | Always dispose client and close server |
| `retryAttempts` not set to `0` in rejection tests | Default retry masks the 4403 close event | Set `retryAttempts: 0` for auth-rejection assertions |
| Asserting `data` without checking `errors` | Masked errors produce false positives | Check `errors === undefined` before asserting data |
| Using `executeOperation` for subscription tests | Apollo in-process runner does not start a WS server | Use transport-layer client with `createClient` |
| Single combined test for subscribe + auth + filter | Failures hard to diagnose | One test per behavior |
| Testing only the transport, not the resolver | Resolver pubsub logic goes untested | Combine `graphql.subscribe()` unit tests with transport integration tests |

## Limitations

- **Resolver isolation tests require a testable pubsub instance.** If the
  production pubsub is injected via context, pass a test double; if it is a
  module singleton, reset it in `beforeEach`.
- **WS close-code assertions are timing-sensitive.** Use `retryAttempts: 0`
  and wrap in a `done` callback (or `Promise` + event listener) rather than
  awaiting the iterator.
- **SSE in Node requires `fetch` or a polyfill.** `graphql-sse` clients
  default to the global `fetch`; Node < 18 needs `node-fetch` or `undici`.
- **Does not cover HTTP-layer concerns.** CORS, rate limiting, and response
  headers for the SSE endpoint need separate HTTP-layer tests (e.g.,
  `supertest`).
- **Does not cover schema-contract drift.** Pair with
  `graphql-schema-regression` (in the qa-contract-testing plugin)
  to catch subscription field renames between provider and consumer.

## References

- graphql-ws get-started and recipes:
  [the-guild.dev/graphql/ws/get-started](https://the-guild.dev/graphql/ws/get-started),
  [the-guild.dev/graphql/ws/recipes](https://the-guild.dev/graphql/ws/recipes).
- graphql-ws protocol docs (MessageType, ClientOptions, ServerOptions,
  close codes):
  [the-guild.dev/graphql/ws/docs](https://the-guild.dev/graphql/ws/docs).
- graphql-sse get-started and recipes:
  [the-guild.dev/graphql/sse/get-started](https://the-guild.dev/graphql/sse/get-started),
  [the-guild.dev/graphql/sse/recipes](https://the-guild.dev/graphql/sse/recipes).
- GraphQL October 2021 spec, Section 6.3 Subscription (Cloudflare-protected;
  cite by stable ID): subscription execution model, single-root-field
  constraint, per-event independent execution.
- Sibling skill (queries/mutations, in-process):
  `apollo-server-tests`.
- Sibling skill (Yoga transport, including SSE via Yoga):
  `graphql-yoga-tests`.
- Contract-drift cross-plugin:
  `graphql-schema-regression`.
