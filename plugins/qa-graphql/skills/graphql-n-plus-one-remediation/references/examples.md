# Worked examples

Two scenarios that exercise the Step 2 classification and the Step 3 fix
choice end to end.

## Worked example 1: ORM lazy-loading, the silent case

Input resolver:

```typescript
Post: {
  comments: (post) => post.comments,  // looks like a passthrough
}
```

This matches the "safe passthrough" row in Step 2 only if the parent query
loaded `comments`. Prisma returns related records only when the query asks
via `include` or `select`
([prisma.io](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries)),
so check the parent query first. If `Query.posts` has no
`include: { comments: true }`, this is the lazy-load N+1 case.

Confirm with the query log rather than by reading:

```typescript
const prisma = new PrismaClient({ log: ["query"] });
// Run the failing query, then count emitted statements.
// N statements of the form SELECT ... FROM Comment WHERE postId = ?
// confirms the fan-out; one SELECT ... WHERE postId IN (...) is the fix.
```

Report:

```markdown
**Pattern:** silent N+1 via ORM lazy-loading.

**Location:** `resolvers/post.ts:67`

`post.comments` is not present on the parent result, so accessing it
triggers a separate query per post.

**Fix:** B if every `posts` query needs comments: add
`include: { comments: true }` to the `Query.posts` resolver. A if
`comments` is also reached from other parents, or if the comment list per
post is large enough that eager joining causes duplication of post
columns across comment rows.
```

## Worked example 2: one HTTP call per row

Input resolver:

```typescript
User: {
  paymentMethod: (user) => paymentClient.fetchById(user.paymentMethodId),
}
```

Report:

~~~markdown
**Pattern:** N+1 via per-row HTTP call to the payment service.

**Location:** `resolvers/user.ts:34`

Worse than a database N+1: every invocation pays full network round-trip
latency, and the calls contend for the HTTP client's connection pool.

**Fix:** A (DataLoader) wrapping a batch endpoint.

```typescript
const paymentLoader = new DataLoader<string, PaymentMethod | null>(
  async (ids) => {
    const found = await paymentClient.fetchMany([...ids]);   // batch endpoint
    return ids.map(id => found.find(p => p.id === id) ?? null);
  }
);
```

The re-map is required: the batch endpoint may return rows in any order and
may omit unknown ids, and DataLoader requires the values array to match the
keys array in both length and index order
([github.com/graphql/dataloader](https://github.com/graphql/dataloader)).

If the payment service has no batch endpoint, the fix is cross-team: add
the batch endpoint first, then wrap it. Fixes B and C do not apply, since
the data lives outside the database the parent query reads.
~~~
