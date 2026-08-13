# qa-graphql

GraphQL server testing: per-framework testing (Apollo Server, GraphQL Yoga with Mercurius in its references, Hasura), subscription test authoring, N+1 detection + remediation, and the attack-surface hardening skill (depth/cost limits, with introspection + persisted-query catalogs in its references). Distinct from qa-contract-testing/graphql-schema-regression (contract drift detection); this plugin covers server/runtime + framework-specific patterns.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [apollo-server-tests](skills/apollo-server-tests/SKILL.md) | Wraps Apollo Server testing patterns: `server.executeOperation()` (in-process, no HTTP), `supertest` against an ephemeral-port HTTP serve... |
| Skill | [graphql-complexity-limit-tester](skills/graphql-complexity-limit-tester/SKILL.md) | GraphQL attack-surface hardening: over-limit depth/cost query tests, plus introspection + persisted-query catalogs in references/. |
| Skill | [graphql-subscription-test-author](skills/graphql-subscription-test-author/SKILL.md) | Authors test suites for GraphQL subscription resolvers over graphql-ws (WebSocket) and graphql-sse (Server-Sent Events) transports: subsc... |
| Skill | [graphql-yoga-tests](skills/graphql-yoga-tests/SKILL.md) | Wraps GraphQL Yoga testing patterns: `yoga.fetch()` for in-process HTTP-conformant request simulation (no network); Mercurius patterns in references/mercurius.md. |
| Skill | [hasura-tests](skills/hasura-tests/SKILL.md) | Wraps Hasura GraphQL Engine testing patterns: docker-compose for a controllable test instance, metadata API for declarative schema/permis... |
| Skill | [graphql-n-plus-one-remediation](skills/graphql-n-plus-one-remediation/SKILL.md) | Detects and fixes GraphQL N+1: repo-scan detection workflow, resolver-tree classification, and DataLoader / projection / prefetch fixes. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-graphql@testland-qa
```
