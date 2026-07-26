# Resolver, filter, and error tests

Isolate the resolver's pubsub wiring from the transport stack, then assert the
filter predicate and error propagation.

## Resolver-level pubsub test

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

## Event-sequence and filter tests

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

## Error propagation tests

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
