# qa-graphql

GraphQL server testing: introspection attack-surface reference, persisted-query strategy, per-framework testing (Apollo Server, GraphQL Yoga, Hasura, Mercurius, Pothos), and an N+1 query detector. Distinct from qa-contract-testing/graphql-schema-regression (contract drift detection); this plugin covers server/runtime + framework-specific patterns.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [apollo-server-test](skills/apollo-server-test/SKILL.md) | Wraps Apollo Server testing patterns: `server.executeOperation()` (in-process, no HTTP), `supertest` against an ephemeral-port HTTP serve... |
| Skill | [graphql-complexity-limit-tester](skills/graphql-complexity-limit-tester/SKILL.md) | Crafts over-limit depth and complexity queries then asserts rejection before execution, verifying that graphql-depth-limit, graphql-cost-... |
| Skill | [graphql-subscription-test-author](skills/graphql-subscription-test-author/SKILL.md) | Authors test suites for GraphQL subscription resolvers over graphql-ws (WebSocket) and graphql-sse (Server-Sent Events) transports: subsc... |
| Skill | [graphql-yoga-test](skills/graphql-yoga-test/SKILL.md) | Wraps GraphQL Yoga testing patterns: `yoga.fetch()` for in-process HTTP-conformant request simulation (no network), `@graphql-tools/execu... |
| Skill | [hasura-test](skills/hasura-test/SKILL.md) | Wraps Hasura GraphQL Engine testing patterns: docker-compose for a controllable test instance, metadata API for declarative schema/permis... |
| Skill | [introspection-attack-surface-reference](skills/introspection-attack-surface-reference/SKILL.md) | Pure-reference catalog of GraphQL introspection as an attack surface and the production-deployment controls for it. |
| Skill | [mercurius-test](skills/mercurius-test/SKILL.md) | Wraps Mercurius (Fastify GraphQL plugin) testing patterns: `app.inject()` for HTTP-layer simulation without spinning up a network listene... |
| Skill | [persisted-query-strategy-reference](skills/persisted-query-strategy-reference/SKILL.md) | Pure-reference catalog of GraphQL Persisted Query strategies. |
| Skill | [pothos-builder-tests](skills/pothos-builder-tests/SKILL.md) | Wraps Pothos GraphQL schema-builder testing patterns: testing the SchemaBuilder output (lexicographicSortSchema + printSchema for snapsho... |
| Agent | [n-plus-one-query-detector](agents/n-plus-one-query-detector.md) | Read-only specialist that scans GraphQL resolver code for the canonical N+1 query pattern - a resolver on a list field whose inner field-... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-graphql@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
