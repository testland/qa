---
name: graphql-complexity-limit-tester
description: "Crafts over-limit depth and complexity queries then asserts rejection before execution, verifying that graphql-depth-limit, graphql-cost-analysis, and graphql-armor (max-depth / cost-limit / max-tokens plugins) are actually enforced and not just configured. Use when auditing a GraphQL service for DoS exposure after depth or cost limits have been added as mitigations, or when adding tests that prove the limits in CI before a production deployment."
rating: 24
d6: 4
keywords:
  - graphql
  - depth-limit
  - complexity
  - cost-analysis
  - dos
  - security
  - graphql-armor
---

# graphql-complexity-limit-tester

## Overview

`introspection-attack-surface-reference` names query-depth limiting and
query-cost limiting as key DoS mitigations, but nothing in that catalog
executes a test. This skill closes that gap: it authors tests that send
an over-limit query and assert a validation error is returned _before_
any resolver runs.

Three library families are covered:

- `graphql-depth-limit` (npm: `graphql-depth-limit`, canonical repo
  `github.com/stems/graphql-depth-limit`, per npm registry
  [registry.npmjs.org/graphql-depth-limit](https://registry.npmjs.org/graphql-depth-limit/latest))
  - `depthLimit(n)` validation rule, drop-in for Apollo or express-graphql.
- `graphql-cost-analysis` (npm: `graphql-cost-analysis`, repo
  `github.com/pa-bru/graphql-cost-analysis`, per
  [github.com/pa-bru/graphql-cost-analysis](https://github.com/pa-bru/graphql-cost-analysis))
  - `costAnalysis({ maximumCost })` validation rule; queries above the
    threshold are rejected.
- `@escape.tech/graphql-armor` (repo
  `github.com/Escape-Technologies/graphql-armor`, docs
  [escape.tech/graphql-armor/docs](https://escape.tech/graphql-armor/docs/getting-started))
  - `max-depth` plugin: default `n = 6` (per
    [escape.tech/graphql-armor/docs/plugins/max-depth](https://escape.tech/graphql-armor/docs/plugins/max-depth))
  - `cost-limit` plugin: default `maxCost = 5000` (per
    [escape.tech/graphql-armor/docs/plugins/cost-limit](https://escape.tech/graphql-armor/docs/plugins/cost-limit))
  - `max-tokens` plugin: default `n = 1000` (per
    [escape.tech/graphql-armor/docs/plugins/max-tokens](https://escape.tech/graphql-armor/docs/plugins/max-tokens))

Differentiation vs. `apollo-server-test`: that skill covers resolver
correctness + production-config gates (introspection, APQ,
hideSchemaDetails). This skill is scoped exclusively to depth/complexity
DoS tests - over-limit query construction, validation-layer rejection
assertion, and the cross-library matrix.

## d6 = 0 hard-reject rule

If the server under test has no depth or complexity limit configured at
all (no `depthLimit`/`costAnalysis` validation rule, no
`ApolloArmor`/`EnvelopArmorPlugin` installed), halt immediately:

```
HALT: no depth/complexity limit configured.
      Tests would pass vacuously - no enforcement exists to verify.
      Install graphql-depth-limit, graphql-cost-analysis, or
      @escape.tech/graphql-armor first, then re-run this skill.
```

Do not write tests that assert on a server with no limit - they will
produce false positives.

## Step 1 - Install

Choose the library that matches the project.

```bash
# graphql-depth-limit (express-graphql / Apollo standalone rule)
npm install --save-dev graphql-depth-limit

# graphql-cost-analysis (Apollo standalone rule)
npm install --save-dev graphql-cost-analysis

# graphql-armor (Apollo or Envelop/Yoga - bundles all plugins)
npm install --save @escape.tech/graphql-armor
```

## Step 2 - Identify the configured limit

Read the server setup to find the active limit value before crafting
queries. Common locations:

| Library | Where the limit lives |
|---|---|
| `graphql-depth-limit` | `depthLimit(N)` in `validationRules` array |
| `graphql-cost-analysis` | `costAnalysis({ maximumCost: N })` in `validationRules` |
| `graphql-armor` max-depth | `armor.protect()` or `new ApolloArmor({ maxDepth: { n: N } })` |
| `graphql-armor` cost-limit | `new ApolloArmor({ costLimit: { maxCost: N } })` |

If the limit is not explicit, use the library default: `n = 6` for
graphql-armor max-depth (per
[escape.tech/graphql-armor/docs/plugins/max-depth](https://escape.tech/graphql-armor/docs/plugins/max-depth)),
`maxCost = 5000` for graphql-armor cost-limit (per
[escape.tech/graphql-armor/docs/plugins/cost-limit](https://escape.tech/graphql-armor/docs/plugins/cost-limit)).

## Step 3 - Craft over-limit queries

### Depth query

Build a query whose nesting depth is `configuredLimit + 1`. If the
schema is `User { friends: [User] }` and the depth limit is 5:

```graphql
query DepthBust {
  user {          # depth 1
    friends {     # depth 2
      friends {   # depth 3
        friends { # depth 4
          friends {  # depth 5
            friends { id }  # depth 6 -> over limit
          }
        }
      }
    }
  }
}
```

For schemas without recursive types, chain any nested relationship
until the depth exceeds the limit.

### Cost/complexity query

For `graphql-cost-analysis`, assign costs via the schema directive
`@cost(complexity: N)` or via `costMap`. To construct an over-limit
query without schema changes, use a fan-out pattern whose calculated
cost exceeds `maximumCost`. Per
[github.com/pa-bru/graphql-cost-analysis](https://github.com/pa-bru/graphql-cost-analysis),
`defaultCost` applies to each field when no explicit cost is set; repeat
high-cost fields until the sum exceeds the threshold:

```graphql
query CostBust {
  users { id name email createdAt updatedAt roles permissions profile
    settings { notifications theme language timezone } }
}
```

For `graphql-armor` cost-limit, the default costs are: `objectCost = 2`,
`scalarCost = 1`, `depthCostFactor = 1.5` (per
[escape.tech/graphql-armor/docs/plugins/cost-limit](https://escape.tech/graphql-armor/docs/plugins/cost-limit)).
A query with cost above `maxCost = 5000` can be crafted by stacking
scalar fields at multiple nesting levels.

### Max-tokens query

For graphql-armor `max-tokens`, the default token limit is `n = 1000`
(per [escape.tech/graphql-armor/docs/plugins/max-tokens](https://escape.tech/graphql-armor/docs/plugins/max-tokens)).
Tokens include field names, arguments, braces, and directives. A query
with more than 1000 tokens can be constructed by repeating field
selections:

```graphql
query TokenBust {
  users {
    f1 f2 f3 f4 f5 f6 f7 f8 f9 f10
    # ... repeat until token count > configured limit
  }
}
```

## Step 4 - Write the tests

### graphql-depth-limit with Apollo Server

Per the `apollo-server-test` skill, use `executeOperation` for
in-process validation. The `depthLimit(n)` rule is passed as a
`validationRules` option (per npm registry description of
`graphql-depth-limit`).

```typescript
import { ApolloServer } from '@apollo/server';
import depthLimit from 'graphql-depth-limit';
import { typeDefs, resolvers } from './schema';

const DEPTH_LIMIT = 5;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(DEPTH_LIMIT)],
});

test('rejects query exceeding depth limit', async () => {
  const overDepthQuery = `
    query DepthBust {
      user { friends { friends { friends { friends { friends { id } } } } } }
    }
  `;
  const resp = await server.executeOperation({ query: overDepthQuery });
  if (resp.body.kind !== 'single') throw new Error('expected single');

  // Validation errors are returned in errors[], not thrown
  expect(resp.body.singleResult.errors).toBeDefined();
  expect(resp.body.singleResult.data).toBeUndefined();
});

test('accepts query within depth limit', async () => {
  const safeQuery = `
    query SafeDepth {
      user { friends { id } }
    }
  `;
  const resp = await server.executeOperation({ query: safeQuery });
  if (resp.body.kind !== 'single') throw new Error('expected single');
  expect(resp.body.singleResult.errors).toBeUndefined();
});
```

### graphql-cost-analysis with Apollo Server

Per [github.com/pa-bru/graphql-cost-analysis](https://github.com/pa-bru/graphql-cost-analysis),
`costAnalysis` plugs into `validationRules` alongside any other rules:

```typescript
import { ApolloServer } from '@apollo/server';
import costAnalysis from 'graphql-cost-analysis';

const MAX_COST = 100;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    costAnalysis({
      maximumCost: MAX_COST,
      defaultCost: 1,
      variables: {},
    }),
  ],
});

test('rejects query exceeding cost limit', async () => {
  // Each field costs defaultCost=1; repeat fields to exceed MAX_COST
  const fields = Array.from({ length: MAX_COST + 1 }, (_, i) => `field${i}`).join('\n    ');
  const overCostQuery = `query CostBust { users { ${fields} } }`;

  const resp = await server.executeOperation({ query: overCostQuery });
  if (resp.body.kind !== 'single') throw new Error('expected single');
  expect(resp.body.singleResult.errors).toBeDefined();
});
```

The `createError(maximumCost, cost)` option (per
[github.com/pa-bru/graphql-cost-analysis](https://github.com/pa-bru/graphql-cost-analysis))
lets you assert on a custom error message if the project overrides the
default error format.

### graphql-armor (Apollo) - depth + cost + tokens

Per [escape.tech/graphql-armor/docs/getting-started](https://escape.tech/graphql-armor/docs/getting-started),
`ApolloArmor` spreads protection options into the server constructor:

```typescript
import { ApolloServer } from '@apollo/server';
import { ApolloArmor } from '@escape.tech/graphql-armor';

const armor = new ApolloArmor({
  maxDepth: { n: 4 },         // override default 6
  costLimit: { maxCost: 200 }, // override default 5000
  maxTokens: { n: 50 },       // override default 1000
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  ...armor.protect(),
});

test('graphql-armor rejects over-depth query', async () => {
  const query = `{ a { b { c { d { e { id } } } } } }`; // depth 6 > limit 4
  const resp = await server.executeOperation({ query });
  if (resp.body.kind !== 'single') throw new Error('expected single');
  expect(resp.body.singleResult.errors).toBeDefined();
  // With exposeLimits: true (default), error includes limit detail
  // With exposeLimits: false, message is 'Query validation error.'
  // Per escape.tech/graphql-armor/docs/plugins/max-depth
});

test('graphql-armor rejects over-cost query', async () => {
  // objectCost=2, scalarCost=1, depthCostFactor=1.5 (defaults per
  // escape.tech/graphql-armor/docs/plugins/cost-limit)
  // Stack fields so calculated cost > maxCost=200
  const query = `{ users { id name email createdAt updatedAt
    profile { bio avatar roles permissions settings { a b c d e } } } }`;
  const resp = await server.executeOperation({ query });
  if (resp.body.kind !== 'single') throw new Error('expected single');
  expect(resp.body.singleResult.errors).toBeDefined();
});

test('graphql-armor rejects over-token query', async () => {
  // n=50 tokens; build a query with more than 50 tokens
  const fields = Array.from({ length: 60 }, (_, i) => `f${i}`).join(' ');
  const query = `{ users { ${fields} } }`;
  const resp = await server.executeOperation({ query });
  if (resp.body.kind !== 'single') throw new Error('expected single');
  expect(resp.body.singleResult.errors).toBeDefined();
});
```

### graphql-armor (Envelop / GraphQL Yoga)

Per [escape.tech/graphql-armor/docs/getting-started](https://escape.tech/graphql-armor/docs/getting-started):

```typescript
import { envelop } from '@envelop/core';
import { EnvelopArmorPlugin } from '@escape.tech/graphql-armor';

const getEnveloped = envelop({
  plugins: [
    EnvelopArmorPlugin({
      maxDepth: { n: 4 },
      costLimit: { maxCost: 200 },
      maxTokens: { n: 50 },
    }),
  ],
});
```

Test via the Yoga HTTP layer using supertest (same pattern as
`apollo-server-test`).

## Step 5 - Assert rejection happens before execution

Confirm limits are enforced at validation, not resolver time. One way:
instrument a resolver with a side-effect counter and assert it was never
called on an over-limit query:

```typescript
let resolverCallCount = 0;

const server = new ApolloServer({
  typeDefs,
  resolvers: {
    Query: {
      users: () => {
        resolverCallCount++;
        return [];
      },
    },
  },
  validationRules: [depthLimit(3)],
});

test('resolver never called on over-limit query', async () => {
  resolverCallCount = 0;
  const resp = await server.executeOperation({
    query: '{ users { friends { friends { friends { id } } } } }',
  });
  if (resp.body.kind !== 'single') throw new Error('expected single');
  expect(resp.body.singleResult.errors).toBeDefined();
  expect(resolverCallCount).toBe(0); // validation short-circuits execution
});
```

## Running

```bash
npm test                                    # jest / vitest discover *.test.ts
npx jest --testPathPattern complexity -t "limit"
```

Run against the production configuration. Tests that pass in
`NODE_ENV=test` but fail in `NODE_ENV=production` (or vice versa) signal
a configuration drift problem. See the CI note in `apollo-server-test`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Writing depth tests without checking the actual configured limit | Query may be under-limit; test passes vacuously | Read `validationRules` / `ApolloArmor` config first |
| Testing at depth = limit (not limit+1) | Boundary is ambiguous; limit is exclusive or inclusive depending on library | Use limit+1 to be unambiguous |
| Asserting `errors[0].message` string exactly | Error text includes dynamic limit values; brittle | Assert `errors` is defined; check `extensions.code` if set |
| Skipping the resolver-call assertion | A misconfigured rule may reach resolvers silently | Instrument resolvers to confirm validation short-circuits |
| Using `depthLimit` and `costAnalysis` together without verifying precedence | First rule to reject wins; a low depth limit may mask cost-limit tests | Test each rule independently with the other absent |
| Assuming graphql-armor defaults when the project overrides them | Wrong threshold = vacuous pass | Always read the actual `ApolloArmor(...)` / `EnvelopArmorPlugin(...)` call |

## Limitations

- **Schema-dependent query construction.** Over-limit queries require
  real field names from the schema under test. This skill provides
  pattern templates - adapt them to the actual type graph.
- **`graphql-depth-limit` does not cover cost/fan-out attacks.** Depth 2
  with 1000 siblings is not blocked. Pair with a cost rule.
- **`graphql-cost-analysis` is not actively maintained.** Check the
  project's dependency health before adopting; `@escape.tech/graphql-armor`
  cost-limit is the actively maintained alternative.
- **`max-tokens` counts tokens in the document AST, not resolver calls.**
  It prevents parsing overhead but not algorithmic fan-out in resolvers.
  Pair with cost-limit for full coverage.
- **`executeOperation` tests do not cover HTTP-level rate limiting.**
  Network-layer limits (nginx, API gateway) need HTTP integration tests.

## References

- `graphql-depth-limit` (npm: `graphql-depth-limit`, canonical repo
  `github.com/stems/graphql-depth-limit`):
  [registry.npmjs.org/graphql-depth-limit](https://registry.npmjs.org/graphql-depth-limit/latest)
- `graphql-cost-analysis` (npm: `graphql-cost-analysis`):
  [github.com/pa-bru/graphql-cost-analysis](https://github.com/pa-bru/graphql-cost-analysis)
- `@escape.tech/graphql-armor` (repo `github.com/Escape-Technologies/graphql-armor`):
  [escape.tech/graphql-armor/docs/getting-started](https://escape.tech/graphql-armor/docs/getting-started)
  - max-depth defaults: [escape.tech/graphql-armor/docs/plugins/max-depth](https://escape.tech/graphql-armor/docs/plugins/max-depth)
  - cost-limit defaults: [escape.tech/graphql-armor/docs/plugins/cost-limit](https://escape.tech/graphql-armor/docs/plugins/cost-limit)
  - max-tokens defaults: [escape.tech/graphql-armor/docs/plugins/max-tokens](https://escape.tech/graphql-armor/docs/plugins/max-tokens)
- Apollo Server `executeOperation` and `validationRules`:
  [apollographql.com/docs/apollo-server/testing/testing](https://www.apollographql.com/docs/apollo-server/testing/testing)
- Attack surface context:
  [`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md)
- Apollo testing patterns:
  [`apollo-server-test`](../apollo-server-test/SKILL.md)
