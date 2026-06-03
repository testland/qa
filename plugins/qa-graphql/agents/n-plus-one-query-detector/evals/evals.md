---
component: n-plus-one-query-detector
type: agent
---

# n-plus-one-query-detector - evals

Companion eval cases for [`n-plus-one-query-detector`](../../n-plus-one-query-detector.md).
Three cases cover happy path / branch / adversarial: a classic per-row DB
`findOne` resolver (verdict `N+1 risk` with `DataLoader` fix), a
batched-loader resolver (verdict `Safe`), and an out-of-scope refusal for
a REST controller with no GraphQL resolvers in scope.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date - 
each case is designed to be reproducible against any tier.

## Eval 1 - happy path - per-row DB call (N+1 risk)

**Input:**

```
Review this GraphQL resolver file for N+1 patterns.

File: resolvers/post.ts

import { db } from '../db';

export const resolvers = {
  Query: {
    posts: () => db.posts.findMany({ limit: 50 }),
  },
  Post: {
    author: (post) => db.users.findOne({ where: { id: post.authorId } }),
    comments: (post) => db.comments.findMany({ where: { postId: post.id } }),
  },
};

Schema:
  type Query { posts: [Post!]! }
  type Post { id: ID! author: User! comments: [Comment!]! }
  type User { id: ID! name: String! }

We don't use DataLoader anywhere in the codebase yet. p99 latency on
`{ posts { author { name } } }` is ~1.2s and scales with list size.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 2 classifies `Post.author` as `N+1 risk` (per-row
`db.users.findOne`) and `Post.comments` as `N+1 risk` (per-row
`db.comments.findMany` on parent.id). Step 3 recommends Fix A
(DataLoader) for `author` because `User` is a cross-cutting type;
recommends Fix B (projection / include) or Fix A for `comments`. Output
follows the template: a `## N+1 detection` heading, `Pattern: N+1`
language, the literal `DataLoader` proposed fix, and a `Findings summary`
table where `Post.author` shows severity `high` and fix `DataLoader`.

**Pass condition:** Output contains the literal string `N+1` AND the
literal string `DataLoader` AND the literal string `Post.author`.
Output does NOT mark `Post.author` as `Safe`.

## Eval 2 - branch - DataLoader already in use (Safe)

**Input:**

```
Review this GraphQL resolver file for N+1 patterns.

File: resolvers/post.ts

import DataLoader from 'dataloader';
import { db } from '../db';

// Per-request context setup (in context.ts):
//   const userLoader = new DataLoader<string, User>(async (ids) => {
//     const users = await db.users.findMany({ where: { id: { in: [...ids] } } });
//     return ids.map(id => users.find(u => u.id === id) || null);
//   });
//   context.loaders = { user: userLoader };

export const resolvers = {
  Query: {
    posts: (_, __, ctx) => db.posts.findMany({
      limit: 50,
      include: { comments: true },
    }),
  },
  Post: {
    author: (post, _, ctx) => ctx.loaders.user.load(post.authorId),
    comments: (post) => post.comments,           // already eager-loaded by parent
    title: (post) => post.title,                  // passthrough, no DB call
  },
};

Schema:
  type Query { posts: [Post!]! }
  type Post { id: ID! title: String! author: User! comments: [Comment!]! }
  type User { id: ID! name: String! }
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 classifies `Post.author` as `Safe — explicit batching`
(matches the `Uses DataLoader (batched via loader.load(id))` row of the
classification table), `Post.comments` as `Safe — no DB call` (returns
a field already in the parent via `include: { comments: true }`), and
`Post.title` as `Safe — no DB call`. No `N+1 risk` rows are emitted; the
findings summary is either empty or contains only `Safe` rows. The
report should not recommend a DataLoader fix because batching is
already in place.

**Pass condition:** Output contains the literal string `Safe` AND
contains the substring `DataLoader` only in the context of an
acknowledgement that batching is already in place (NOT as a proposed
fix). Output does NOT contain the literal string `N+1 risk` as a
finding row label for `Post.author`.

## Eval 3 - adversarial - out of scope (no GraphQL resolvers)

**Input:**

```
Review this code for N+1 patterns.

File: src/controllers/orders.controller.ts

import { Controller, Get, Param } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Get()
  listOrders() {
    return this.orderService.findAll();
  }
}

This is a REST controller. There is no GraphQL schema, no resolver
map, no Apollo / Mercurius / graphql-tools / yoga / Pothos / Nexus
in package.json, and `git grep "buildSchema\|makeExecutableSchema\|@Resolver"`
returns no results.
```

**Target models:** sonnet (2026-05-25)

**Expected:** The agent refuses to issue an `N+1 risk` / `Safe` verdict
on REST controller code. Per the agent's documented scope ("scans
GraphQL resolver code for the canonical N+1 query pattern"), this
input does not contain a resolver map and the inner-field-resolver
pattern that defines GraphQL N+1 is not applicable. The agent should
state that no GraphQL resolvers were found and recommend a DB-level
slow-query detector (the agent's own Limitations section names
`qa-load-testing/db-slow-query-detector` as the cross-plugin handoff
for SQL-side N+1). It must not emit a `## N+1 detection` findings
table on REST code.

**Pass condition:** Output contains a refusal phrase such as `no
GraphQL` / `not a GraphQL` / `out of scope` / `no resolvers` AND
mentions `db-slow-query-detector` or `qa-load-testing` as the
recommended handoff. Output does NOT contain a `Findings summary`
table with `N+1 risk` rows pointing at the controller methods.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a sample repo.
- Pass conditions are literal-substring checks; a reviewer can grep
  the agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's
  D7 sub-checks (Evals exist, Multi-model coverage, Acceptance
  criteria, Adversarial coverage, Reproducibility).
