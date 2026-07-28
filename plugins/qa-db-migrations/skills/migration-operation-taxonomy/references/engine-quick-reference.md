# Engine quick reference and worked example

Consolidated lock, rewrite, and severity-divergence tables for the checks in
SKILL.md, plus a full worked classification. The classification procedure
itself lives in SKILL.md; this file is the lookup companion.

## PostgreSQL quick reference

PostgreSQL, current manual (fetched 2026-07-19), version notes called out
where behavior changed.

| Statement | Lock | Rewrite | Source |
|---|---|---|---|
| `ALTER TABLE` (baseline) | `ACCESS EXCLUSIVE` unless noted | depends on clause | [sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html) |
| `ADD COLUMN` nullable or constant `DEFAULT` | `ACCESS EXCLUSIVE`, brief | no rewrite from PG 11 | [release 11.0](https://www.postgresql.org/docs/release/11.0/), [sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html) |
| `ADD COLUMN` volatile `DEFAULT`, stored generated, identity | `ACCESS EXCLUSIVE` | full rewrite of table and indexes | [sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html) |
| `ALTER COLUMN ... TYPE` | `ACCESS EXCLUSIVE` | normally full rewrite, narrow binary-coercible exception | [sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html) |
| `SET NOT NULL` | `ACCESS EXCLUSIVE` | scans whole table unless a valid `CHECK` proves no NULL | [sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html) |
| `ADD FOREIGN KEY` | `SHARE ROW EXCLUSIVE` on both tables | no rewrite | [sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html) |
| `VALIDATE CONSTRAINT` | `SHARE UPDATE EXCLUSIVE`, plus `ROW SHARE` on the referenced table for an FK | no rewrite | [sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html) |
| `CREATE INDEX` | `SHARE`, blocks writes not reads | n/a | [explicit-locking](https://www.postgresql.org/docs/current/explicit-locking.html), [sql-createindex](https://www.postgresql.org/docs/current/sql-createindex.html) |
| `CREATE INDEX CONCURRENTLY` | `SHARE UPDATE EXCLUSIVE`, two scans, no transaction block | n/a | [explicit-locking](https://www.postgresql.org/docs/current/explicit-locking.html), [sql-createindex](https://www.postgresql.org/docs/current/sql-createindex.html) |
| `DROP COLUMN` | `ACCESS EXCLUSIVE`, fast | column not physically removed, space reclaimed over time | [sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html) |
| `TRUNCATE` | `ACCESS EXCLUSIVE`, blocks all concurrent operations | reclaims space immediately, rolls back with the transaction | [sql-truncate](https://www.postgresql.org/docs/current/sql-truncate.html) |

## MySQL 8.0 InnoDB quick reference

MySQL 8.0 InnoDB, all rows from
[innodb-online-ddl-operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html).

| Statement | In place | Concurrent DML | Rebuilds table | Notes |
|---|---|---|---|---|
| `ADD COLUMN` | yes | yes, except auto-increment | no with `INSTANT` | `INSTANT` default from 8.0.12; last position only before 8.0.29; `INPLACE` rebuilds |
| `DROP COLUMN` | yes | yes | yes | `INSTANT` default from 8.0.29 |
| Change column data type | no | no | yes | "only supported with `ALGORITHM=COPY`" |
| Widen `VARCHAR` across the 256-byte line | no | no | yes | one length byte below 256 bytes, two at 256 and above |
| Narrow `VARCHAR` | no | no | yes | "requires a table copy (`ALGORITHM=COPY`)" |
| Add secondary index | yes | yes | no | "The table remains available for read and write operations while the index is being created." |
| Add foreign key | only with `foreign_key_checks` disabled | yes | no | otherwise "only the `COPY` algorithm is supported" |
| Set column `NOT NULL` | yes | yes | yes | needs strict SQL mode; "fails if the column contains NULL values" |

## The three divergences that flip a severity

1. **Index creation.** Blocks writes on PostgreSQL without `CONCURRENTLY`;
   permits concurrent DML on MySQL 8.0. Category 3 versus category 1.
2. **Column type change.** Rewrites on PostgreSQL under `ACCESS EXCLUSIVE`,
   and on MySQL forces `ALGORITHM=COPY` with no concurrent DML. Critical on
   both, but for different reasons, and the MySQL mitigation (a copy-based
   online schema change tool) is not the PostgreSQL one.
3. **Adding a foreign key.** A metadata-cheap `SHARE ROW EXCLUSIVE` on
   PostgreSQL that spreads to a second table, versus a full table copy on a
   default-configured MySQL. Warning versus Critical.

## Worked example

Target: PostgreSQL 16, `users` 40M rows, `orders` 180M rows, `products`
2M rows, sizes taken from a prior data-load migration in the same series.

```sql
ALTER TABLE users DROP COLUMN legacy_status;
ALTER TABLE orders ADD COLUMN shipped_at timestamptz NOT NULL;
ALTER TABLE orders ADD COLUMN region text NOT NULL DEFAULT 'unknown';
CREATE INDEX ix_orders_status ON orders (status);
ALTER TABLE products ADD CONSTRAINT fk_category
  FOREIGN KEY (category_id) REFERENCES categories(id);
```

Classification:

| # | Statement | Category | Severity | Basis |
|---|---|---|---|---|
| 1 | `DROP COLUMN users.legacy_status` | 5 Breaking + 6 Data-loss | Critical | Column becomes invisible to SQL immediately; space not reclaimed, so the fast completion is not evidence of a cheap operation |
| 2 | `ADD COLUMN orders.shipped_at NOT NULL` no default | 7 Unsafe default | Critical | `SET NOT NULL` requires no NULL rows exist; verify the add-with-NOT-NULL outcome on the target before merge |
| 3 | `ADD COLUMN orders.region NOT NULL DEFAULT 'unknown'` | 1 Additive | Info | Constant default, no rewrite from PG 11; would be Critical on PG 10 |
| 4 | `CREATE INDEX ix_orders_status ON orders (status)` | 3 Locking | Critical | `SHARE` lock blocks inserts, updates, deletes on a 180M-row table for the whole build |
| 5 | `ADD CONSTRAINT fk_category ... REFERENCES categories(id)` | 4 Lock-escalating + 8 Index-missing FK | Warning | `SHARE ROW EXCLUSIVE` on `products` and on `categories`; no index on `products.category_id` |

Note how statements 2 and 3 differ by one clause and three severity bands,
and how statement 4 would be Info against MySQL 8.0.
