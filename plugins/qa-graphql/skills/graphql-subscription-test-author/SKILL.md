---
name: graphql-subscription-test-author
description: "Authors GraphQL subscription resolver test suites over graphql-ws (WebSocket) and graphql-sse (Server-Sent Events) transports: subscribe to event streams via the async-iterator API, assert emitted data shape and sequence, verify connection lifecycle and protocol close codes, and validate auth-on-connect (connectionParams / authenticate callback) plus resolver-level pubsub trigger logic. Use for real-time subscription operations; not for queries or mutations - for those use apollo-server-tests or graphql-yoga-tests (Mercurius in its references)."
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
- `graphql-yoga-tests` (references/mercurius.md) and `hasura-tests` target those specific runtimes.

## How to use

1. Install the transport client(s) plus the test runner (`graphql-ws` + `ws`,
   or `graphql-sse`, alongside `graphql` and `jest`).
2. Start the server on `port: 0` in `beforeAll` so parallel suites each get a
   free OS-assigned port; `dispose()` the runner and `close()` the server in
   `afterAll`.
3. Create a client with `createClient` and drive the subscription through
   `client.iterate()`, pushing each `event.data` into an array; `break` once the
   expected count arrives to close the stream.
4. Assert the emitted sequence and shape against the schema contract, checking
   `errors` is `undefined` before reading `data`.
5. Add auth-on-connect tests: reject a missing / invalid token (close code
   `4403` for WS, `401` for SSE) and accept a valid one.
6. Add a resolver-isolation test with `graphql` `subscribe()` + `pubsub.publish(...)`
   to cover trigger / filter / error logic without a transport.
7. Run under an extended `testTimeout` and `--forceExit` in CI so open sockets
   never hang the runner.

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

### Server setup

Full server bootstraps for both transports (graphql-ws over `ws`, graphql-sse over
Node `http`), including the `port: 0` free-port pattern, are in
[references/transport-server-setup.md](references/transport-server-setup.md).

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

### Auth on connect

`connectionParams` (WS) and the `authenticate` callback (SSE) reject
unauthenticated clients before any event is sent. Full server + test patterns for
both transports, plus the async token-refresh factory, are in
[references/auth-on-connect.md](references/auth-on-connect.md).

### Connection lifecycle and close codes

The graphql-ws protocol close-code table (4400 - 4429) and the ordered
`connecting -> connected -> closed` lifecycle assertion are in
[references/lifecycle-and-close-codes.md](references/lifecycle-and-close-codes.md).

### Resolver, filter, and error tests

Resolver-isolation pubsub tests (via `graphql` `subscribe()`), event-filter
predicate tests, and resolver-error propagation are in
[references/resolver-and-filter-tests.md](references/resolver-and-filter-tests.md).

## Worked example

Scenario: a `messageAdded(channel)` subscription must stream only messages for the
subscribed channel and must reject clients that connect without a token.

1. Start the WS server (see the server-setup reference) with an `onConnect` that
   returns `false` on a missing token.
2. Connect an authed client with `connectionParams: { token: 'valid-token' }` and
   open `client.iterate({ query: 'subscription Messages($channel: String!) { messageAdded(channel: $channel) { text } } ', variables: { channel: 'team-a' } })`.
3. `pubsub.publish` a `team-b` message then a `team-a` message; `await sub.next()`.
4. Assert `value.data?.messageAdded?.text === 'right'` - the `team-b` event was
   filtered out, proving the predicate.
5. Open a second client with `connectionParams: {}` and `retryAttempts: 0`; assert
   its `closed` event carries code `4403`.

Result: one run proves both the resolver filter (only the matching channel
emits) and the auth gate (tokenless connect is refused with `4403`).

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
