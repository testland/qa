# qa-graphql

GraphQL server testing: introspection attack-surface reference, persisted-query strategy, per-framework testing (Apollo Server, GraphQL Yoga, Hasura, Mercurius, Pothos), and an N+1 query detector. Distinct from qa-contract-testing/graphql-schema-regression (contract drift detection); this plugin covers server/runtime + framework-specific patterns.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [apollo-server-tests](skills/apollo-server-tests/SKILL.md) | Wraps Apollo Server testing patterns: `server.executeOperation()` (in-process, no HTTP), `supertest` against an ephemeral-port HTTP serve... |
| Skill | [graphql-complexity-limit-tester](skills/graphql-complexity-limit-tester/SKILL.md) | Crafts over-limit depth and complexity queries then asserts rejection before execution, verifying that graphql-depth-limit, graphql-cost-... |
| Skill | [graphql-subscription-test-author](skills/graphql-subscription-test-author/SKILL.md) | Authors test suites for GraphQL subscription resolvers over graphql-ws (WebSocket) and graphql-sse (Server-Sent Events) transports: subsc... |
| Skill | [graphql-yoga-tests](skills/graphql-yoga-tests/SKILL.md) | Wraps GraphQL Yoga testing patterns: `yoga.fetch()` for in-process HTTP-conformant request simulation (no network), `@graphql-tools/execu... |
| Skill | [hasura-tests](skills/hasura-tests/SKILL.md) | Wraps Hasura GraphQL Engine testing patterns: docker-compose for a controllable test instance, metadata API for declarative schema/permis... |
| Skill | [introspection-attack-surface-reference](skills/introspection-attack-surface-reference/SKILL.md) | Pure-reference catalog of GraphQL introspection as an attack surface and the production-deployment controls for it. |
| Skill | [mercurius-tests](skills/mercurius-tests/SKILL.md) | Wraps Mercurius (Fastify GraphQL plugin) testing patterns: `app.inject()` for HTTP-layer simulation without spinning up a network listene... |
| Skill | [persisted-query-strategy-reference](skills/persisted-query-strategy-reference/SKILL.md) | Pure-reference catalog of GraphQL Persisted Query strategies. |
| Skill | [graphql-n-plus-one-remediation](skills/graphql-n-plus-one-remediation/SKILL.md) | Traces a resolver tree to locate N+1, classifies each child resolver as safe or at risk, and applies per-request DataLoader batching, parent projection, or selection-set-aware prefetch. |
| Agent | [n-plus-one-query-detector](agents/n-plus-one-query-detector.md) | Read-only specialist that scans GraphQL resolver code for the canonical N+1 query pattern - a resolver on a list field whose inner field-... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-graphql@testland-qa
```
