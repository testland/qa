---
name: persisted-query-strategy-reference
description: "Pure-reference catalog of GraphQL Persisted Query strategies. Covers Apollo Automatic Persisted Queries (APQ) — the SHA-256 hash protocol, PersistedQueryNotFoundError flow (client retries with full query + hash; server caches), the `extensions.persistedQuery` payload shape, GET-vs-POST + CDN-cache implications, and the strict-allowlist mode (no auto-registration; only pre-registered hashes execute). Differentiates the three operation modes: APQ auto-register (default; permissive), persisted-query-only (allowlist; rejects unknown hashes), and hybrid (allowlist for prod, auto for dev). Use when designing the request layer for a GraphQL server's prod deployment, choosing between size-optimisation and allowlist-enforcement, or auditing an existing persisted-query configuration. Consumed by apollo-server-test, graphql-yoga-test, mercurius-test, pothos-builder-tests."
rating: 23
d6: 4
archetype: S2
---

# persisted-query-strategy-reference

## Overview

Pure-reference catalog of GraphQL persisted-query strategies. Per
Apollo Server docs
([apollographql.com/docs/apollo-server/performance/apq](https://www.apollographql.com/docs/apollo-server/performance/apq)):
"A persisted query is a query string that's cached on the server
side, along with its unique identifier (always its SHA-256
hash)."

Two motivations, often conflated:

1. **Performance** — smaller payloads, GET-cacheable on CDNs.
2. **Security** — allowlist enforcement; only registered queries
   execute (which mitigates the introspection-attack surface per
   [`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md)).

The configuration mode determines which motivation dominates.
Consumed by per-framework test authors.

## When to use

- Designing the GraphQL request layer for a new production
  service.
- Auditing an existing APQ configuration — is it allowlist-mode
  or auto-register-mode?
- Investigating CDN-cache hit-rate or payload-size issues.
- PR review of changes to the persisted-query setup.

## The hash + extensions protocol

Per Apollo Server docs, the request format:

```
GET /graphql
  ?extensions={"persistedQuery":{"version":1,"sha256Hash":"<HEX>"}}
  &variables={"id":"u1"}
```

Or as POST:

```json
{
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "ecf4edb46db40b5132295c0291d62fb65d6759a9eedfa4d5d612dd5ec54a6b38"
    }
  },
  "variables": { "id": "u1" }
}
```

Apollo's example: `{ __typename }` hashes to
`ecf4edb46db40b5132295c0291d62fb65d6759a9eedfa4d5d612dd5ec54a6b38`.

## The three modes

### Mode 1 — APQ auto-register (default, permissive)

```js
const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: {
    ttl: 900,   // 15 minutes
  },
});
```

**Flow on first request with new hash:**

1. Client sends `{ extensions: { persistedQuery: { sha256Hash: H } } }`.
2. Server cache miss → responds `PERSISTED_QUERY_NOT_FOUND`.
3. Client retries with both the hash + the full `query`.
4. Server hashes the query, verifies it matches `H`, caches with
   TTL, executes.
5. Subsequent calls with `H` succeed (no query string sent).

**What this gets you:**

- Smaller subsequent payloads (just the hash).
- CDN-cacheable GETs (per Apollo: "When configured with
  `useGETForHashedQueries: true`, queries become GET requests
  that CDNs can cache").
- **No allowlist enforcement** — any client can register any
  query.

**Best for:** performance optimisation; not a security control.

### Mode 2 — Persisted-query-only (allowlist, strict)

```js
const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: false,  // Apollo's auto-APQ off
});

// Externally: build a manifest of allowed hashes during CI,
// load into a `pre-registered` store, reject anything not in it.
```

Architecturally: the persisted-queries store is **pre-populated
during the build/deploy** (via codegen of the client app),
**not** by client requests. Any unknown hash → reject (not
register-then-execute).

**Flow:**

1. Build pipeline extracts queries from the client app, hashes
   each, writes to `manifest.json`.
2. Server boot loads `manifest.json` into the persisted-query
   store.
3. Client sends `{ extensions: { persistedQuery: { sha256Hash: H } } }`.
4. Server cache lookup. If hit → execute. If miss → **400 Bad
   Request, no auto-register**.
5. Any request with `query` field set (no hash) → also rejected
   in strict mode.

**What this gets you:**

- Allowlist enforcement: only build-time-known queries execute.
- Strong defence against introspection probes + crafted attack
  queries.
- Smaller payloads + CDN-cacheable.

**Best for:** internet-facing production APIs with a known client
app (web / mobile).

**Tradeoff:** breaks ad-hoc clients (admin tools, GraphiQL,
internal Postman collections). Mitigate via a separate
admin-only endpoint, or a long-lived admin token that bypasses.

### Mode 3 — Hybrid (allowlist prod, auto-register dev)

```js
const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries:
    process.env.NODE_ENV === 'production'
      ? false                      // Mode 2 setup elsewhere
      : { ttl: 900 },              // Mode 1 for dev
});
```

Best of both: dev gets the iteration speed of auto-register;
prod gets the allowlist. **Risk:** config drift — staging may use
dev settings.

## Implementation patterns

### Client side (Apollo Client)

Per Apollo docs:

```typescript
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { sha256 } from 'crypto-hash';

const link = createPersistedQueryLink({
  sha256,
  useGETForHashedQueries: true,    // CDN-cacheable GETs
}).concat(new HttpLink({ uri: '/graphql' }));

const client = new ApolloClient({ link, cache: new InMemoryCache() });
```

`useGETForHashedQueries` is the CDN-cache lever — without it,
POST requests aren't cacheable by most CDNs.

### Generating a manifest for strict mode

```bash
npx graphql-codegen --config codegen.yml
# Outputs operation strings + hashes to manifest.json

# Per Apollo, with @apollo/persisted-query-lists for build-time
# generation:
npm run extract-queries -- --output manifest.json
```

Then in CI / deploy: upload `manifest.json` as a JSON artifact;
server boot reads it.

### Disable APQ entirely (no persisted queries)

Per Apollo: `persistedQueries: false`.

## Per-framework support

| Framework | Persisted-query support |
|---|---|
| Apollo Server | Built-in: `persistedQueries: { ttl }` or `false` |
| GraphQL Yoga | `@graphql-yoga/plugin-persisted-operations` (per yoga docs) |
| Mercurius | `cache: { ... }` + custom resolver |
| Hasura | Allow lists via `query_collections` + `add_to_allowlist` mutations |
| Pothos | Configure via underlying server |

## Testable behaviours

| Mode | Test |
|---|---|
| Mode 1 | First request with unknown hash → 200 with `PERSISTED_QUERY_NOT_FOUND` extension; retry succeeds |
| Mode 2 | Request with unregistered hash → 400 with no registration; subsequent requests still 400 |
| Mode 2 | Request with raw `query` field → 400 (strict mode rejects unhashed) |
| Mode 3 | Same as Mode 1 in dev; same as Mode 2 in prod (test against both NODE_ENV) |
| All modes | Manifest reload preserves existing hashes (no flush during deploy) |
| All modes | TTL expiration in Mode 1 → fallback to retry flow (must not 500) |

These tests prove the chosen mode is actually in effect.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mode 1 with introspection disabled, expecting allowlist | Auto-register accepts any query; allowlist isn't real | Mode 2 (build-time manifest) is the only true allowlist |
| Strict mode without a manifest workflow | First deploy = total service outage (no queries allowed) | Manifest extraction in client build, upload before server deploy |
| Manifest as a single file in image | Schema changes require full image rebuild | Externalise to S3 / config service; reload on signal |
| GraphiQL exposed alongside strict APQ | GraphiQL queries fail; team disables APQ to "debug" | Separate admin endpoint for GraphiQL, with explicit auth |
| TTL too short (60s) | Cold-cache misses → high `PERSISTED_QUERY_NOT_FOUND` rate | `ttl: 900` (15min) or longer for stable queries |
| TTL too long (forever) | Old query versions stick around; security policy stale | Refresh on deploy; ttl 1-7 days max |
| No test asserting `PERSISTED_QUERY_NOT_FOUND` flow works | Client retry logic silently breaks; perf regression unnoticed | E2E test: drop cache, send only-hash, assert retry flow |
| CDN caches POSTs of hashed queries by mistake | Tenant-id in variables → cross-tenant cache contamination | `useGETForHashedQueries: true` + per-tenant cache key derivation |

## Limitations

- **APQ is not encryption.** The hash + the query both leak via
  packet capture once registered.
- **Server-side cache.** A restart wipes Mode 1 caches; clients
  re-register on first request. Strict mode caches are file-
  loaded so durable.
- **CDN cache key.** Variables aren't part of the hash; the CDN
  key needs to include `variables` (and `Authorization` for
  tenant-scoped data) or you get cross-tenant cache hits.
- **Doesn't replace introspection-disable.** A determined
  attacker with introspection enabled can still construct
  queries and submit them; persisted-query strict mode rejects.
- **Mutation safety.** Allowlisting mutations is high-value;
  often misconfigured because mutations are "rare" and tested
  manually.

## References

- Apollo APQ docs:
  [apollographql.com/docs/apollo-server/performance/apq](https://www.apollographql.com/docs/apollo-server/performance/apq).
- Apollo Client persisted-queries link:
  [apollographql.com/docs/react/api/link/persisted-queries](https://www.apollographql.com/docs/react/api/link/persisted-queries).
- GraphQL Yoga persisted-operations plugin:
  [the-guild.dev/graphql/yoga-server/docs](https://the-guild.dev/graphql/yoga-server/docs).
- Companion catalog:
  [`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md).
- Consumed by:
  [`apollo-server-test`](../apollo-server-test/SKILL.md),
  [`graphql-yoga-test`](../graphql-yoga-test/SKILL.md),
  [`mercurius-test`](../mercurius-test/SKILL.md),
  [`pothos-builder-tests`](../pothos-builder-tests/SKILL.md),
  [`n-plus-one-query-detector`](../../agents/n-plus-one-query-detector.md).
