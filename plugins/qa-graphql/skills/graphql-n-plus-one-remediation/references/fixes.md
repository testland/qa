# Fix details

Extended contracts and cautions for the three fixes in Step 3. The core
runnable code for each fix stays inline in SKILL.md; this file holds the
detail you consult once you have picked a fix.

## Fix A: DataLoader batching contracts

DataLoader coalesces all loads within a single tick of the event loop into
one batch call
([github.com/graphql/dataloader](https://github.com/graphql/dataloader)),
so every `.load()` the executor issues for the same field across N parents
lands in one batch call.

Two contracts the batch function must honour, both from the DataLoader
README:

1. The values array must be the same length as the keys array.
2. Each index in the values array must correspond to the same index in the
   keys array.

A `findMany` returns rows in database order and drops missing ids, so the
re-map line in the inline example is mandatory, not decoration. Skipping it
silently attributes one parent's data to another parent.

**Scope every loader to a single request.** DataLoader memoizes loads
within one request, and the README warns against sharing an instance across
users, which can leak cached data into each request. Construct loaders when
a request begins and discard them when it ends. A module-level loader shared
across requests is a cache-poisoning defect that leaks one user's rows into
another user's response. Treat a loader constructed outside per-request
context setup as a finding in its own right, independent of any N+1.

## Fix B: cartesian explosion caution

Fix B is the eager-loading remedy: the EF Core guide recommends eager
loading over lazy loading so the data comes back in one roundtrip, and warns
that lazy loading makes it easy to trigger N+1 inadvertently
([learn.microsoft.com](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying)).

Cost to weigh before choosing B: eagerly joining a one-to-many relation
duplicates the parent columns across every child row. The same EF Core page
names this the "cartesian explosion" problem and notes that as more
one-to-many relationships are loaded, the duplicated data may grow and hurt
performance. Prefer B for to-one relations and for to-many relations with
small fan-out.

## Fix C: selection-set parsing

`parseResolveInfo` from `graphql-parse-resolve-info` turns the fourth
resolver argument into a tree whose `fieldsByTypeName` is an object keyed by
GraphQL object type names, whose values are objects keyed by the requested
field aliases
([github.com/graphile/graphile-engine](https://github.com/graphile/graphile-engine/tree/master/packages/graphql-parse-resolve-info)).
C is B with a condition: it pays a small parsing cost per request to avoid
paying the projection cost on queries that never ask for the field.
