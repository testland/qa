# Plan signatures, fixes, and anti-patterns

Diagnostic lookup tables for `db-query-plan-analyzer`. Read the plan from the
innermost nodes outward; the dominant cost is the node with the highest
`actual time` (PostgreSQL) or highest cumulative cost (MySQL).

## Cost signatures

| Signature                                                    | Meaning                                                    |
|--------------------------------------------------------------|------------------------------------------------------------|
| `Seq Scan on <table>` with high actual time                   | Sequential scan over a large table - likely missing index. |
| `Index Scan` with `Filter:` and many `Rows Removed by Filter` | Index used but most rows filtered out - index isn't selective. |
| `Nested Loop` with high inner-side row count                  | Should likely be a Hash Join - stats may be stale.        |
| `Sort` with `external merge Disk:`                            | Sort spilled - `work_mem` too low or sort is unnecessary.  |
| `Bitmap Heap Scan` followed by `Recheck Cond`                 | Multi-index lookup; usually fine but verify the recheck cost. |
| `Hash` with `Batches: <N>`, N > 1                              | Hash join spilled - `work_mem` too low.                   |

PostgreSQL's `Buffers: shared hit=N read=M` line tells you cache hits vs. disk
reads - a high `read` count is the I/O smoking gun.

## Diagnosis to fix

| Diagnosis                                  | Typical fix |
|--------------------------------------------|-------------|
| Seq Scan on a large table, predicate column not indexed | `CREATE INDEX ON <table>(<column>)`. Use a B-tree by default. |
| Seq Scan because predicate uses a function on the column (`WHERE LOWER(email) = '...'`) | Functional index: `CREATE INDEX ON users (LOWER(email))`. |
| Index Scan but many rows filtered post-index | The leading column of the composite index isn't selective enough; reorder the columns or add a column to the predicate that's more selective. |
| Type cast in `WHERE` (e.g. `id::text = '123'` when `id` is bigint) | Fix the application code to compare with matching types - the cast disables the index. |
| Sort spill                                  | Add an index that returns pre-sorted data, or raise `work_mem` for the session. |
| Nested Loop where Hash Join would win       | Run `ANALYZE <table>` to refresh stats; verify the planner switches; if not, file a planner-level investigation. |
| N+1 (separate queries from app code)        | Eager-load via JOIN at the ORM layer; not a DB fix at all. |

## Index-choice principles

| Principle                                | Why |
|------------------------------------------|-----|
| Leading column = most selective predicate | Composite index columns are used left-to-right; the first column should reduce the result set the most. |
| `WHERE` columns first, then `ORDER BY`    | The index can satisfy filtering AND ordering if the columns align. |
| Use partial indexes for skewed columns   | `WHERE status = 'active'` indexed only for active rows is dramatically smaller than a full index. |
| Functional indexes for non-direct predicates | `LOWER(email)` etc. - the planner can only use the index if the function matches exactly. |
| Avoid indexing low-cardinality columns alone | A boolean column index isn't helpful - partial index or composite is. |

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Adding indexes speculatively                                 | Indexes slow down `INSERT` / `UPDATE`; bloat the table; can produce worse plans. | Only add an index that fixes a specific observed slow query, with the EXPLAIN ANALYZE before/after as evidence. |
| Indexing every column                                        | Same as above; the planner can pick a worse index when too many candidates exist. | Composite indexes that cover multiple queries; periodic review of `pg_stat_user_indexes` to drop unused. |
| Reading EXPLAIN without ANALYZE                              | Estimated rows can be off by 10x+; the plan you see may not match runtime. | Always ANALYZE in non-prod; use sampling in prod (`pg_stat_statements`). |
| Optimizing the wrong node                                    | The deepest cost is often a child of the dominant node; fixing the child alone may help marginally. | Always look for the DOMINANT node first (highest actual time, highest cost ratio). |
| Skipping `ANALYZE <table>` after a bulk load                  | Stale stats produce bad plans even when indexes exist.            | Schedule `ANALYZE` after every bulk-load operation in CI / migrations. |
