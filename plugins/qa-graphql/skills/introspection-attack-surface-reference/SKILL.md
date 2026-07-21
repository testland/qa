---
name: introspection-attack-surface-reference
description: "Pure-reference catalog of GraphQL introspection as an attack surface and the production-deployment controls for it. Covers what introspection exposes (every type, field, directive, deprecation, description via __schema / __type), Apollo Server's default behaviour (introspection: false when NODE_ENV=production), the `hideSchemaDetailsFromClientErrors: true` companion setting (strips 'did you mean' suggestions), Yoga / Mercurius / Hasura equivalents, query-depth + query-cost limits, persisted-query allowlisting as the strongest mitigation, and the testable behaviours each control creates. Use when designing the production-safety posture of a GraphQL server or auditing an existing deployment."
---

# introspection-attack-surface-reference

## Overview

Pure-reference catalog of GraphQL introspection as a production
attack surface and the controls available to mitigate it. Per
Apollo Server docs
([apollographql.com/docs/apollo-server/api/apollo-server](https://www.apollographql.com/docs/apollo-server/api/apollo-server)):
"Introspection enables important development tools... However,
this capability also allows attackers to explore your API
structure."

Consumed by the per-framework GraphQL testing skills.
This skill does not execute anything.

## When to use

- Designing the production-deployment posture for a GraphQL
  server.
- Auditing an existing deployment - is introspection disabled,
  and is the test suite proving it?
- Writing tests that gate the production introspection setting.
- PR review where someone proposes enabling introspection in
  production for "debugging."

## What introspection exposes

Per the GraphQL spec, the `__schema` and `__type` queries return:

| Field | Reveals |
|---|---|
| `__schema.types` | Every type defined (including internal) |
| `__schema.queryType` / `mutationType` / `subscriptionType` | Operation roots |
| `__schema.directives` | Custom directives + arguments |
| `__type(name: "X").fields` | Every field on type X - names, types, deprecation |
| `__type.fields.args` | Argument names, types, default values |
| `__type.description` | Schema docstrings (often have internal context) |

A single query: `query { __schema { types { name fields { name type { name } } } } }`
returns the entire API surface in JSON. An attacker uses this
to:

1. Enumerate every operation (often inferring auth gaps from
   missing `Mutation` field-level checks).
2. Map type relationships → infer the data model.
3. Find deprecated fields (often kept for backwards compat,
   often less hardened).
4. Find internal-looking types/fields (`AdminUser`, `_internal`,
   `__legacy`) → high-value targets.

## Production controls

### Disable introspection

Per
[apollographql.com/docs/apollo-server/api/apollo-server](https://www.apollographql.com/docs/apollo-server/api/apollo-server):

```js
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: false,
});
```

Apollo defaults to `introspection: true` **except** when
`NODE_ENV === 'production'`. Explicit is safer:

```js
introspection: process.env.NODE_ENV !== 'production'
```

### Hide "did you mean" suggestions

Apollo Server also recommends `hideSchemaDetailsFromClientErrors:
true` - without it, a typo (`{ usre { id } }`) returns
`"Did you mean 'user'?"`, leaking field names even with
introspection disabled.

### Per-framework controls

| Framework | Disable introspection |
|---|---|
| Apollo Server | `introspection: false` constructor option |
| GraphQL Yoga | `maskedErrors: { ... }` + use [`@graphql-yoga/plugin-disable-introspection`](https://the-guild.dev/graphql/yoga-server/docs) |
| Mercurius (Fastify) | `graphiql: false` + `routes: false` (or per-route) |
| Hasura | `HASURA_GRAPHQL_DISABLE_INTROSPECTION_PUBLIC_API=true` |
| Pothos (schema builder) | Configure the underlying server (Yoga/Apollo) |

## Mitigations beyond disabling

Disabling introspection is the start, not the end. A determined
attacker can still field-fuzz with educated guesses. Additional
controls:

### Query-depth limiting

Reject queries with depth > N. Prevents the
"recursive friendship-graph fan-out" DoS:

```graphql
query { user { friends { friends { friends { friends { ... } } } } } }
```

Use `graphql-depth-limit` (Apollo) or
`@envelop/depth-limit` (Yoga). Typical limit: 5-7 for client-
facing schemas; higher for trusted internal.

### Query-cost analysis

Assign a cost to each field; reject queries with total cost > N.
Catches breadth-attacks where depth is low but the multiplicative
fan-out (e.g., `posts { comments { likes { user { profile } } } }`)
is enormous.

`graphql-cost-analysis` (Apollo) or `@envelop/operation-complexity`
(Yoga).

### Field-level authorisation

Per-field `@auth` directives or resolver-level checks. Even with
introspection on, attackers can't read what they can't access.
Belt-and-suspenders with disabling.

### Persisted-query allowlisting

The strongest mitigation. Only pre-registered query hashes
execute; ad-hoc queries (including introspection probes) are
rejected at the request layer. See
[`persisted-query-strategy-reference`](../persisted-query-strategy-reference/SKILL.md).

## Testable behaviours

Each control creates a test:

| Control | Test |
|---|---|
| Introspection disabled in prod | `POST /graphql { __schema { types { name } } }` → 400 / "introspection is not allowed" |
| `hideSchemaDetailsFromClientErrors` | Typo query → no "did you mean" in response |
| Query-depth limit | Construct depth-N+1 query → error "exceeds maximum operation depth" |
| Query-cost limit | Construct high-cost query → error "exceeds maximum operation cost" |
| Persisted-query allowlist | Submit non-allowlisted hash → `PERSISTED_QUERY_NOT_FOUND` (per [`persisted-query-strategy-reference`](../persisted-query-strategy-reference/SKILL.md)) |

These tests **must** run against the production configuration - 
running them against `NODE_ENV=test` may give false positives if
test config differs from prod.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `introspection: true` in production for debugging | Permanent attack surface; "temporary" debug becomes default | Use BFF + protected admin schema for debug; never main API |
| Trusting Apollo's NODE_ENV default | One mis-set env var = leak | Explicit `process.env.NODE_ENV !== 'production'` or hard `false` |
| Disable introspection but allow GraphiQL UI | GraphiQL queries introspect | Disable both |
| Disable introspection without testing | Config drift; deploys re-enable silently | Production smoke test asserts 400 on `__schema` query |
| Field-level auth on Query but not Mutation | Mutations often the more sensitive | Audit every field, both directions |
| No depth / cost limit, introspection disabled | Brute-force fuzzing still works | Layer the mitigations |
| Persisted queries enabled but `PERSISTED_QUERY_NOT_FOUND` retries succeed | Effectively no allowlist | See [`persisted-query-strategy-reference`](../persisted-query-strategy-reference/SKILL.md) Mode 3 |
| Production schema includes `description` with internal context | Schema disclosure even via partial introspection | Sanitise descriptions; treat as user-visible |

## Limitations

- **Disabling introspection doesn't hide the schema entirely.**
  Field guessing still works. Treat introspection-disable as
  defence-in-depth, not the whole defence.
- **Persisted queries break ad-hoc clients.** Internal admin
  tools that build queries on the fly need a separate endpoint.
- **Codegen / Schema-first dev workflows.** Need a way to fetch
  the schema in CI without exposing it publicly: schema-push to
  an internal artifact registry (Apollo Studio, Hive).
- **GraphiQL on staging.** A common leak - staging schema often
  mirrors prod; staging URL discovered → schema disclosed.
- **`__typename` always works.** Even with introspection off, the
  meta-field `__typename` returns the type name in responses - 
  some inference still possible.

## References

- Apollo Server introspection guidance:
  [apollographql.com/docs/apollo-server/api/apollo-server](https://www.apollographql.com/docs/apollo-server/api/apollo-server).
- GraphQL Yoga disable-introspection plugin:
  [the-guild.dev/graphql/yoga-server/docs](https://the-guild.dev/graphql/yoga-server/docs).
- Persisted-query mitigation:
  [`persisted-query-strategy-reference`](../persisted-query-strategy-reference/SKILL.md).
- Consumed by:
  [`apollo-server-tests`](../apollo-server-tests/SKILL.md),
  [`graphql-yoga-tests`](../graphql-yoga-tests/SKILL.md),
  [`hasura-tests`](../hasura-tests/SKILL.md),
  [`mercurius-tests`](../mercurius-tests/SKILL.md),
  [`pothos-builder-tests`](../pothos-builder-tests/SKILL.md).
