# Auth on connect

Reject unauthenticated clients before any event is sent: `connectionParams` on the
WS client, the `authenticate` callback on the SSE handler.

## Auth on connect (graphql-ws)

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

## Auth on connect (graphql-sse)

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
