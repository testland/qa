---
name: db-query-plan-analyzer
description: "Reads `EXPLAIN` / `EXPLAIN ANALYZE` output from PostgreSQL, MySQL, or SQLite - identifies the dominant cost (sequential scan, nested loop, sort spill, missing index, type-cast preventing index use), proposes the specific index or query rewrite to fix it, and emits the candidate `CREATE INDEX` statement. Use when load testing or production telemetry shows the database as the bottleneck and the team needs targeted query-level remediation."
---

# db-query-plan-analyzer

## Overview

Most API perf regressions resolve to one of:

1. A new query running unindexed (sequential scan over a growing
   table).
2. A query joining on the wrong column type (implicit cast prevents
   index use).
3. A sort that doesn't fit in `work_mem` and spills to disk.
4. A query plan that started using a nested loop where a hash join
   would be faster (or vice versa) due to stale stats.
5. A query touching N+1 rows because of an ORM N+1 access pattern.

`EXPLAIN ANALYZE` (PostgreSQL), `EXPLAIN ANALYZE` (MySQL 8.0+),
or `EXPLAIN QUERY PLAN` (SQLite) reveals which case you're in. This
skill reads that output and proposes the fix. The query-plan
vocabulary (Sequential Scan, Index Scan, Nested Loop) comes from
PostgreSQL's [Using EXPLAIN][pg-explain].

[pg-explain]: https://www.postgresql.org/docs/current/using-explain.html

## When to use

- A load test showed DB-bound latency growth.
- An APM tool (Datadog / New Relic / Grafana) flagged a slow query.
- A production incident traced to a specific query.
- An `EXPLAIN ANALYZE` was captured but the team can't tell which
  cost is dominant.

If the bottleneck is connection-pool exhaustion or replication lag,
this skill doesn't apply - those are infrastructure concerns.

## Step 1 - Get a real EXPLAIN ANALYZE

Always use `ANALYZE` (it runs the query and reports actual rows +
time); plain `EXPLAIN` gives only planner estimates, which can be
wildly wrong.

### PostgreSQL

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON, SETTINGS)
SELECT o.id, o.status
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE c.email = 'test@example.com'
  AND o.created_at >= NOW() - INTERVAL '30 days'
ORDER BY o.created_at DESC
LIMIT 50;
```

`BUFFERS` adds I/O statistics; `FORMAT JSON` produces machine-
readable output; `SETTINGS` shows session-specific settings that
affected the plan ([pg-explain][pg-explain]).

### MySQL 8.0+

```sql
EXPLAIN ANALYZE SELECT ...;
```

Output is a tree representation similar to PostgreSQL.

### SQLite

```sql
EXPLAIN QUERY PLAN SELECT ...;
```

SQLite's output is simpler - no costs, just the access strategy
(Index / Sequential / Search).

## Step 2 - Identify the dominant cost

Read the plan from the **innermost nodes outward** (the deepest
nesting is what runs first). The dominant cost is the node with the
highest `actual time` in PostgreSQL or the highest cumulative cost
in MySQL. Match the node to its meaning using the cost-signature
table in [references/plan-signatures.md](references/plan-signatures.md).

## Step 3 - Match cost to fix

Look up the diagnosis in the diagnosis-to-fix table in
[references/plan-signatures.md](references/plan-signatures.md) (Seq
Scan -> add index, type cast -> fix app code, sort spill -> pre-sorted
index or larger `work_mem`, N+1 -> eager-load at the ORM, etc.).

## Step 4 - Emit the candidate index / rewrite

Per [pg-explain][pg-explain] index-creation conventions:

```sql
-- Single-column index on a high-selectivity column
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Composite index - order matters; leading column is the most selective
CREATE INDEX idx_orders_customer_created ON orders(customer_id, created_at DESC);

-- Partial index - covers only the rows the query touches
CREATE INDEX idx_orders_active ON orders(created_at DESC) WHERE status = 'active';

-- Functional index - for predicates with a function on the column
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Covering index (PostgreSQL 11+) - avoids a heap fetch
CREATE INDEX idx_orders_summary ON orders(customer_id) INCLUDE (status, total);
```

For which column leads, when to use partial vs. functional indexes,
and low-cardinality pitfalls, see the index-choice principles in
[references/plan-signatures.md](references/plan-signatures.md).

## Output format

````markdown
## Slow query analysis - `<query-id-or-snippet>`

**Database:** postgresql 17 | mysql 8.0 | sqlite
**Query:** (excerpt)

```sql
SELECT o.id, o.status FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE c.email = 'test@example.com' AND o.created_at >= NOW() - INTERVAL '30 days'
ORDER BY o.created_at DESC LIMIT 50;
```

### Plan summary

| Node                         | Actual time | Rows  | Cost driver |
|------------------------------|------------:|------:|-------------|
| Seq Scan on orders (filter)   |       2.3s | 1.2M  | **DOMINANT** - no index on (customer_id, created_at) |
| Index Scan on customers (email) |     1ms |    1   | (covered)    |

### Diagnosis

The query joins `orders` to `customers` on `customer_id`, but
`orders` has no index on `customer_id` - the planner falls back to a
sequential scan over 1.2M rows, then post-filters by date.

### Recommended fix

```sql
CREATE INDEX idx_orders_customer_created ON orders(customer_id, created_at DESC);
```

Composite index ordered by `customer_id` first (the join predicate),
then `created_at` descending - satisfies both the filter and the
ORDER BY without a separate sort.

### Expected impact

- Plan changes from Seq Scan to Index Scan.
- Actual time drops from ~2.3s to ~50ms (rows-touched falls from
  1.2M to ~50).
- `Buffers: shared read` drops correspondingly; less I/O on the
  database.

### Validation

After applying:

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

Confirm the new plan uses `idx_orders_customer_created` and the
actual time is below the budget.
````

## Anti-patterns

See the anti-patterns table in
[references/plan-signatures.md](references/plan-signatures.md)
(speculative indexing, reading EXPLAIN without ANALYZE, optimizing a
non-dominant node, skipping `ANALYZE` after a bulk load).

## Limitations

- **Vendor-specific output.** PostgreSQL's `EXPLAIN` is the most
  detailed; MySQL 8.0+ caught up; SQLite is sparse. The skill is
  most useful for postgres-flavored databases.
- **Distributed databases.** Spanner, CockroachDB, Citus produce
  different plans - the skill's heuristics translate but the
  specific node names differ.
- **Doesn't replace a DBA.** For complex multi-CTE queries with
  recursive sub-plans, a human DBA is faster than this skill's
  pattern matching.

## References

- [pg-explain][pg-explain] - PostgreSQL's canonical `EXPLAIN` /
  `EXPLAIN ANALYZE` reference.
- MySQL EXPLAIN - https://dev.mysql.com/doc/refman/8.0/en/explain.html
- SQLite Query Plan - https://www.sqlite.org/eqp.html
- "Use the Index, Luke" - https://use-the-index-luke.com/ - a
  practitioner reference for index design.
- `flame-graph-analyzer` - 
  sibling skill for the application-side bottleneck (vs. this
  skill's database-side focus).
- `k6-load-testing` and siblings - 
  load runners that surface DB-bound regressions.
