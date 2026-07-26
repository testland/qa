# Connection lifecycle and close codes

## Protocol close codes (graphql-ws)

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

## Lifecycle assertion (graphql-ws)

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
