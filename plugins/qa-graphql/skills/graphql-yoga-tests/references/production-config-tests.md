# Production-config tests

Mirror the production plugin set in test so prod-only gates are exercised. Run these
under `NODE_ENV=production` in CI.

## Introspection disabled

Per `introspection-attack-surface-reference`:

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

## Persisted-operations test

Per `persisted-query-strategy-reference` Mode 2:

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
