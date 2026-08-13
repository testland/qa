---
name: graphql-n-plus-one-remediation
description: "Detects and fixes the GraphQL N+1 pattern: scans a repo, PR diff, or schema type for list-returning resolvers (grep-driven detection workflow), traces the resolver tree to locate the fan-out (one parent query returns N rows, then a child field resolver fires once per row), classifies every child field resolver as safe or N+1 risk, and applies one of three fixes: per-request DataLoader batching, eager projection in the parent resolver, or selection-set-aware prefetch. Use when reviewing a PR that adds or changes a list-returning resolver, when a connection-pool exhaustion or slow-query alert traces back to GraphQL traffic, or when a resolver trace shows a child field resolved once per parent row."
---

# graphql-n-plus-one-remediation

## What N+1 looks like in a resolver tree

One field returns a list of N rows. The executor then invokes the resolver
for each inner field once per row, so if `Query.topReviews` returns ten
reviews the executor resolves `Review.product` ten times, and a data-source
call in that child field becomes ten calls
([apollographql.com](https://www.apollographql.com/docs/graphos/schema-design/guides/handling-n-plus-one)).
So 1 outer query plus N inner queries equals N+1.

```typescript
// Parent resolver fetches N posts
posts: () => db.posts.findMany({ limit: 50 })

// Inner field-resolver fires once per post (50 DB calls)
Post: {
  author: (post) => db.users.findOne({ where: { id: post.authorId } }),
}
```

GraphQL makes the pattern easy to hit because the resolver tree, not the
caller, decides how many times a child field runs.

Observable symptoms (practitioner heuristics, not standardised
thresholds):

- Tail latency on a list field grows roughly in proportion to the number
  of rows the list returns.
- Database connection pool exhaustion under modest GraphQL request rates.
- A resolver-level trace shows the child field resolved once per parent
  row rather than once per request.

## What this skill owns, and what it does not

Owned: locating the N+1 pattern inside a resolver tree and changing the
data-loading strategy so the child field costs one batched call instead
of N calls.

Not owned:

- **Query complexity or depth limiting.** Those reject an expensive
  query before execution. They cap what a client may ask for. They do
  not make a legitimate list query cheap, and a schema with correct
  batching still needs them for denial-of-service protection.
- **Rate limiting.** That caps how many requests a client sends. An N+1
  resolver is still N+1 on the first allowed request.
- **Caching strategy.** DataLoader's cache is a per-request memoization of
  `.load()` calls, not a shared store, and does not replace Redis or Memcache
  ([github.com/graphql/dataloader](https://github.com/graphql/dataloader)).
  Deciding what to put in Redis is a different job from removing the
  fan-out.
- **SQL-level fan-out.** A resolver that looks batched in JavaScript can
  still emit per-row SQL underneath. Confirm at the database layer with
  a query-log or slow-query analysis.

## Step 0: Detection workflow (repo scan)

When the input is a repo, PR diff, or schema type rather than a known
resolver, locate the candidates first. Input modes:

- A specific resolver file or directory (`resolvers/post.ts`).
- A PR diff (`git diff main...HEAD --name-only -- '*resolvers*'`).
- A schema type (`User`) - find all resolvers on that type.

Grep for list-returning resolvers and entry points:

```bash
grep -rn "resolve:.*=>" resolvers/
grep -rn "Query: {\|Mutation: {" resolvers/  # entry points
grep -rn "\[.*\]" schema/                     # list-typed fields in schema
```

Enumerate every resolver that returns a list **and** every field resolver
on the types in those lists, then continue with Step 1. SQL-level fan-out
beneath the ORM hands off to `db-query-plan-analyzer`.

## Step 1: Map the parent and child pairs

For every field that returns a list, write down the type it returns and
every field resolver defined on that type. That parent/child pair is the
only place N+1 can appear: a field resolver on a non-list parent runs
once and cannot fan out.

Record the pairs in a table before judging any of them:

| Parent field | Returns | Child field resolvers on the returned type |
|---|---|---|
| `Query.posts` | `[Post]` | `Post.author`, `Post.comments` |
| `Post.comments` | `[Comment]` | `Comment.author` |

Nested list fields matter most: `Query.posts` returning 50 posts, each
with `Post.comments` returning 10 comments, gives 500 invocations of
`Comment.author`.

## Step 2: Classify each child field resolver

Classify every child field resolver from the table above. Only the last
three rows need a fix.

| Resolver pattern | Verdict |
|---|---|
| Calls a batching loader (`loader.load(id)`) | **Safe**: batched per tick |
| Returns a value already on the parent object (`(parent) => parent.author`) and the parent query eagerly fetched it | **Safe**: no data-source call |
| Reads from an in-memory structure already on the request context | **Safe**: no per-call data-source hit |
| Makes one database call per invocation (`db.x.findOne({ ... })`) | **N+1 risk** |
| Makes one HTTP call per invocation | **N+1 risk**, usually worse: each call pays network latency |
| Reads a related record through an ORM that lazy-loads | **N+1 risk**, and silent: the ORM hides the extra roundtrip |

The second row has a trap. `(parent) => parent.author` is safe only when
the parent query actually loaded `author`. In Prisma, related records are
not returned unless the query asks for them via `include` or `select`
([prisma.io](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries)).
If the parent query has no matching `include` or `select`, that passthrough
is the silent-lazy-load case, not the safe case.

Do not assume a framework batches for you. Verify batching in that
framework's own documentation before marking a resolver safe.

## Step 3: Pick one of three fixes

| Fix | Use when |
|---|---|
| A: DataLoader batching | The child field is cross-cutting: several parent types resolve it, or it is reached through more than one path in the same query |
| B: Projection in the parent resolver | The child field is needed on essentially every query of that parent |
| C: Prefetch with a selection-set-aware include | The child field is sometimes requested, and projecting it unconditionally costs real work (a wide join, a large column) |

### Fix A: DataLoader batching

DataLoader coalesces every `.load()` issued within one tick of the event
loop into a single batch call
([github.com/graphql/dataloader](https://github.com/graphql/dataloader)),
so N parents resolving the same field cost one call.

```typescript
// In context setup, once per incoming request
const userLoader = new DataLoader<string, User | null>(async (ids) => {
  const users = await db.users.findMany({ where: { id: { in: [...ids] } } });
  return ids.map(id => users.find(u => u.id === id) ?? null);
});
context.loaders = { user: userLoader };

// Resolver becomes a load call
Post: {
  author: (post, _, ctx) => ctx.loaders.user.load(post.authorId),
}
```

The re-map line is mandatory: `findMany` returns rows in database order and
drops missing ids, so the values array must be realigned to the keys array.
Scope every loader to a single request; a module-level loader leaks one
user's rows into another's response. Full batch-function contracts and the
per-request scoping failure mode: [references/fixes.md](references/fixes.md).

### Fix B: Projection in the parent resolver

Ask the parent query for the related rows so the child resolver has
nothing left to fetch.

```typescript
posts: () => db.posts.findMany({
  limit: 50,
  include: { author: true },   // one query, relation eagerly loaded
})

// The child field-resolver is now a passthrough
Post: {
  author: (post) => post.author,
}
```

This is the eager-loading remedy EF Core recommends over lazy loading
([learn.microsoft.com](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying)).
Weigh one cost first: eagerly joining a one-to-many relation duplicates the
parent columns across every child row (EF Core's "cartesian explosion").
Prefer B for to-one relations and to-many relations with small fan-out;
detail in [references/fixes.md](references/fixes.md).

### Fix C: Prefetch with a selection-set-aware include

Read the incoming query's selection set in the parent resolver and project
conditionally. `parseResolveInfo` from `graphql-parse-resolve-info` turns
the fourth resolver argument into a tree whose `fieldsByTypeName` is keyed
by GraphQL type names, then by requested field aliases
([github.com/graphile/graphile-engine](https://github.com/graphile/graphile-engine/tree/master/packages/graphql-parse-resolve-info)).

```typescript
import { parseResolveInfo } from 'graphql-parse-resolve-info';

posts: (_, args, ctx, info) => {
  const tree = parseResolveInfo(info);
  const includeAuthor = 'author' in (tree?.fieldsByTypeName?.Post ?? {});
  return db.posts.findMany({
    limit: 50,
    include: { author: includeAuthor },
  });
}
```

C is B with a condition. It pays a small parsing cost per request to
avoid paying the projection cost on queries that never ask for the field.

## Step 4: Prove the fix with a call-count assertion

A structural fix is not done until a test pins the call count. Issue the
query that triggered the fan-out and assert the number of data-source
calls, not the response shape:

```typescript
test('Post.author resolves in one batched call', async () => {
  const spy = jest.spyOn(db.users, 'findMany');
  await execute(`{ posts { author { name } } }`);   // 50 posts
  expect(spy).toHaveBeenCalledTimes(1);             // not 50
});
```

Assert on the batched call count. Asserting only that the response is
correct passes just as happily with 50 queries as with one.

To confirm at the database layer, turn on the client's query log and
count the emitted statements. Prisma exposes this through the client
constructor:

```typescript
const prisma = new PrismaClient({ log: ["query", "info", "warn", "error"] });
```

Each event carries the statement, its parameters, and its duration
([prisma.io/docs/orm/prisma-client/observability-and-logging/logging](https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging)).
Repeated near-identical `SELECT` statements differing only by a bound id
confirm the fan-out. One `SELECT ... IN (...)` confirms the batch.

## Output shape

Report one finding per risky child field resolver, then a summary table.

~~~markdown
## N+1 findings: `<resolver_path>`

**Scope:** <file>:<lines>

### Finding 1: `Post.author`

**Pattern:** N+1 via per-row database call.

**Location:** `resolvers/post.ts:42`

**Evidence:**

```typescript
Post: {
  author: (post) => db.users.findOne({ where: { id: post.authorId } }),
}
```

When `Query.posts` returns 50 posts, this resolver fires 50 times, giving
50 `findOne` calls.

**Recommended fix:** A (DataLoader). `author` is also resolved from
`Comment.author` and `Like.author`, so it is cross-cutting.

```typescript
// Per-request context setup:
const userLoader = new DataLoader<string, User | null>(async (ids) => {
  const users = await db.users.findMany({ where: { id: { in: [...ids] } } });
  return ids.map(id => users.find(u => u.id === id) ?? null);
});

// Resolver:
Post: { author: (post, _, ctx) => ctx.loaders.user.load(post.authorId) }
```

**Test:** issue `{ posts { author { name } } }` and assert
`db.users.findMany` was called once, not 50 times.

### Summary

| Field | Severity | Fix | Cross-cutting |
|---|---|---|---|
| `Post.author` | high | A: DataLoader | yes |
| `Post.comments` | medium | B: projection via include | no |
| `User.followers` | high | A: DataLoader plus cursor pagination | yes |
~~~

Severity here is a reporting convention, not a standard: rate a finding
high when the fan-out is unbounded (a list field with no page-size cap)
or crosses a network boundary, medium when the list is capped and the
call stays in-process.

## Worked examples

Two end-to-end scenarios - an ORM lazy-load silent case and a per-row HTTP
call - each with its Step 2 classification, chosen fix, and report:
[references/examples.md](references/examples.md).

## Limitations

- **Structural, not measured.** A resolver that could fan out but in
  practice always hits a warm cache is a false positive. Confirm against
  a query log or a resolver trace before filing it.
- **Dynamic dispatch is invisible.** Resolvers wired through reflection,
  generated maps, or `__resolveType` do not read as a parent/child pair
  in source.
- **SQL-level fan-out is out of reach.** ORM calls that look batched in
  application code can still emit per-row SQL. Pair this with a
  database-side slow-query analysis for that layer.
- **Fix A is not always right.** If the field is loaded once per request,
  a loader adds indirection for no batching gain, and projection (Fix B)
  is simpler. Present the option and let the reviewer choose.
- **Aggregate N+1 across fields.** Two resolvers that are each fine in
  isolation can combine into an explosion under one query. Detecting that
  needs execution traces, not source reading.
