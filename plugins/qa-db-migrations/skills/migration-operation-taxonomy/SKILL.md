---
name: migration-operation-taxonomy
description: "Classifies every DDL and DML statement in a database migration into an eight-category operation taxonomy (additive, backwards-compatible alter, locking, lock-escalating, breaking, data-loss, unsafe default, index-missing foreign key) and assigns a Critical, Warning, or Info severity justified by the lock mode and table-rewrite behavior the target engine actually performs. Records where PostgreSQL and MySQL/InnoDB diverge for the same logical statement, and where behavior is version-gated (PostgreSQL 11 removed the table rewrite for a constant DEFAULT; MySQL 8.0.12 made ADD COLUMN instant). Use when a migration file appears in a diff or a review queue and someone must decide, before it reaches a production-sized table, which statements are safe and which will stall writes or destroy data."
---

# Migration operation taxonomy

A migration is not one risk. It is a list of statements, each with its own
lock mode, its own rewrite behavior, and its own blast radius. This skill
gives you the classification scheme: how to split a migration into
statements, sort each one into one of eight categories, attach a severity
that a lock or rewrite fact justifies, and record which engine and which
engine version the answer depends on.

## Scope boundary

This skill classifies what a migration **does** and how dangerous that is.

It deliberately does **not**:

- write or rewrite migration SQL,
- choose a migration tool or framework,
- run, apply, or roll back a migration,
- read the repository to find migration files or downstream consumers.

If you need a severity for a statement, you are in the right place. If you
need the statement itself authored or executed, you are not.

## Step 1 - Fix the three inputs before classifying anything

Classification is meaningless without these. Record them explicitly, and
say "unknown" rather than guessing.

| Input | Why it changes the answer |
|---|---|
| Engine | `ADD INDEX` on a large table blocks writes on PostgreSQL and does not on MySQL 8.0 InnoDB. Same logical statement, opposite severity. |
| Engine major and minor version | `ADD COLUMN ... DEFAULT 'x'` rewrites the whole table before PostgreSQL 11 and does not from 11 on. `ADD COLUMN` is instant from MySQL 8.0.12 and only in-place before it. |
| Table row count or size | Every lock-holding operation is Info on an empty table and Critical on a billion-row table. Without a size signal, report the severity band and mark the size "unverified" rather than picking a point value. |

If the engine is unknown, classify the statement in every engine you
plausibly target and report the worst case, labelled per engine. Do not
collapse two engines into one verdict.

## Step 2 - Split the migration into statements

One row of output per statement, not per file. A single file mixing
`DROP COLUMN`, `ADD COLUMN ... NOT NULL`, and `ADD CONSTRAINT` produces
three classifications with three different severities. Multi-clause
`ALTER TABLE t ADD COLUMN a, ALTER COLUMN b TYPE ...` splits into one row
per clause, because the clauses carry different lock and rewrite behavior.

## Step 3 - Sort each statement into one of eight categories

| # | Category | Examples | Default severity |
|---|---|---|---|
| 1 | Additive | `ADD COLUMN` nullable or with a constant `DEFAULT`, `CREATE INDEX CONCURRENTLY`, `CREATE TABLE`, `CREATE VIEW`, `GRANT` | Info |
| 2 | Backwards-compatible alter | Rename paired with a compatibility view or alias, adding a default to an existing column, `ADD CONSTRAINT ... NOT VALID` | Info |
| 3 | Locking | Plain `CREATE INDEX` on PostgreSQL, `ALTER COLUMN ... TYPE`, `ADD COLUMN` with a volatile default or stored generated column | Warning, or Critical on a large table |
| 4 | Lock-escalating | `ADD CONSTRAINT ... FOREIGN KEY`, which also locks a table the statement does not name | Warning |
| 5 | Breaking (consumer-facing) | `DROP COLUMN`, `RENAME COLUMN` with no compatibility alias, narrowing `ALTER COLUMN ... TYPE`, `DROP TABLE`, `DROP CONSTRAINT` | Critical |
| 6 | Data-loss | `DROP COLUMN` on a populated column, `TRUNCATE`, `DELETE` with no `WHERE`, narrowing type change | Critical |
| 7 | Unsafe default | `ADD COLUMN ... NOT NULL` with no `DEFAULT` on a populated table, narrowing a `varchar` length | Critical |
| 8 | Index-missing FK | `ADD CONSTRAINT ... FOREIGN KEY (col)` with no index on `col` | Warning |

A statement can land in more than one category. `DROP COLUMN` on a
populated column is both Breaking (category 5) and Data-loss (category 6);
report it once at the higher severity and name both categories.

### Severity rationale

Severity is not a feeling. Each band is anchored to a concrete consequence:

- **Critical**: the statement can take production down, destroy data that
  no backup step precedes, or break a live consumer with no coordination
  window. A Critical statement needs a plan, not a nit.
- **Warning**: measurable downtime or a performance regression that a
  team-side mitigation (off-peak scheduling, a concurrent variant, an
  index added first) can remove. The statement is correct; the timing is
  not.
- **Info**: the operation is safe at the sizes in play. Reported for
  completeness so the reader can see the classification was applied to
  every statement, not just the alarming ones.

Anything that only becomes Critical above some table size is a Warning
until a size signal exists. Say so in the finding rather than inflating.

## Step 4 - Apply the five engine hazard checks

These are the checks that decide whether a category-3 or category-4
statement is a Warning or a Critical.

### Check 1 - Index build without the concurrent variant (PostgreSQL)

A plain `CREATE INDEX` acquires a `SHARE` lock, which per the
[PostgreSQL explicit-locking reference](https://www.postgresql.org/docs/current/explicit-locking.html)
"protects a table against concurrent data changes" and is "Acquired by
`CREATE INDEX` (without `CONCURRENTLY`)". The
[CREATE INDEX reference](https://www.postgresql.org/docs/current/sql-createindex.html)
puts the effect plainly: "Other transactions can still read the table, but
if they try to insert, update, or delete rows in the table they will block
until the index build is finished."

`CREATE INDEX CONCURRENTLY` avoids that, at a cost the same page states:
PostgreSQL "must perform two scans of the table, and in addition it must
wait for all existing transactions that could potentially modify or use the
index to terminate", and "a regular `CREATE INDEX` command can be performed
within a transaction block, but `CREATE INDEX CONCURRENTLY` cannot". It
also warns that on failure the command "will fail but leave behind an
'invalid' index" that "will be ignored for querying purposes because it
might be incomplete; however it will still consume update overhead"
([sql-createindex](https://www.postgresql.org/docs/current/sql-createindex.html)).

Classify a plain `CREATE INDEX` on a PostgreSQL target as category 3.
Warning on a table with no size signal, Critical when a size signal shows
a large table. The transaction-block restriction matters: a migration
runner that wraps each migration in a transaction cannot run the concurrent
form, so recommending it also means recommending the statement move out of
the transactional path.

**This check does not transfer to MySQL.** Per the
[MySQL 8.0 InnoDB online DDL operations reference](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html),
adding a secondary index is In Place, permits concurrent DML, and does not
rebuild the table: "The table remains available for read and write
operations while the index is being created." On MySQL 8.0 a plain
`ADD INDEX` is category 1, Info.

### Check 2 - Full table rewrite under an exclusive lock

The
[PostgreSQL ALTER TABLE reference](https://www.postgresql.org/docs/current/sql-altertable.html)
states the baseline: "An `ACCESS EXCLUSIVE` lock is acquired unless
explicitly noted." That mode, per
[explicit-locking](https://www.postgresql.org/docs/current/explicit-locking.html),
"Conflicts with locks of all modes" and "guarantees that the holder is the
only transaction accessing the table in any way", so it blocks reads as
well as writes.

A rewrite on top of that lock is what turns a fast statement into an
outage. From
[sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html):

- Type change: "Changing the type of an existing column will normally cause
  the entire table and its indexes to be rewritten." The exception is
  narrow: "if the `USING` clause does not change the column contents and
  the old type is either binary coercible to the new type or an
  unconstrained domain over the new type, a table rewrite is not needed.
  However, indexes will still be rebuilt unless the system can verify that
  the new index would be logically equivalent to the existing one."
- Column addition with certain defaults: "Adding a column with a volatile
  `DEFAULT` (e.g., `clock_timestamp()`), a stored generated column, an
  identity column, or a column with a domain data type that has constraints
  will cause the entire table and its indexes to be rewritten. Adding a
  virtual generated column never requires a rewrite."

**Version gate.** The constant-default case is the one that changed.
PostgreSQL 11 shipped "Allow `ALTER TABLE` to add a column with a non-null
default without doing a table rewrite", noting "This is enabled when the
default value is a constant"
([PostgreSQL 11 release notes](https://www.postgresql.org/docs/release/11.0/)).
The current manual states the resulting behavior: with a non-volatile
`DEFAULT` "the default value is evaluated at the time of the statement and
the result stored in the table's metadata ... making the `ALTER TABLE` very
fast even on large tables", and "In neither case is a rewrite of the table
required"
([sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html)).
So `ADD COLUMN x int NOT NULL DEFAULT 0` is category 1 on PostgreSQL 11 and
later, and category 3 Critical on PostgreSQL 10 and earlier. Do not classify
it without the version.

**MySQL 8.0 InnoDB divergence.** A type change is worse, not better:
"Changing the column data type is only supported with `ALGORITHM=COPY`",
which does not permit concurrent DML and rebuilds the table
([innodb-online-ddl-operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)).
Column addition is better: `INSTANT` "is the default algorithm as of MySQL
8.0.12, and `INPLACE` before that", and "Before MySQL 8.0.29, the `INSTANT`
algorithm could only add a column as the last column of the table". The
same page notes the in-place fallback still costs a rebuild: "The table is
rebuilt if `ALGORITHM=INPLACE` is used to add a column", and concurrent DML
"is not permitted when adding an auto-increment column".

### Check 3 - Statistics gap after a large data change

`ANALYZE` "collects statistics about the contents of tables in the
database, and stores the results in the `pg_statistic` system catalog.
Subsequently, the query planner uses these statistics to help determine the
most efficient execution plans for queries", and "Accurate statistics will
help the planner to choose the most appropriate query plan, and thereby
improve the speed of query processing"
([sql-analyze](https://www.postgresql.org/docs/current/sql-analyze.html)).
The same page ties the explicit call to autovacuum state: "When autovacuum
is disabled, it is a good idea to run `ANALYZE` periodically, or just after
making major changes in the contents of a table."

That is the documented rule. Running `ANALYZE` at the end of a bulk-load
migration **even when autovacuum is enabled**, so that the first queries
after deploy do not plan against pre-load statistics, is a **practitioner
convention, not a documented requirement**. Flag its absence after a bulk
`INSERT`, `UPDATE`, or `DELETE` as Warning and say which of the two it is:
a documented gap if autovacuum is off on the target, a convention
otherwise.

### Check 4 - Partition key touched

Per the
[PostgreSQL partitioning reference](https://www.postgresql.org/docs/current/ddl-partitioning.html),
partition pruning is where "the planner will examine the definition of each
partition and prove that the partition need not be scanned because it could
not contain any rows meeting the query's `WHERE` clause", and critically
"partition pruning is driven only by the constraints defined implicitly by
the partition keys, not by the presence of indexes."

Because pruning depends on the partition key and nothing else, any
statement that changes the partition key column (its type, its semantics,
or the expression the table is partitioned by) puts every pruned plan in
the system at risk, and no index can compensate. Classify a statement
touching a column named in `PARTITION BY RANGE (...)`, `PARTITION BY LIST
(...)`, or `PARTITION BY HASH (...)` as category 3, Warning, and require a
plan check (compare `EXPLAIN` output before and after) rather than asserting
that pruning will or will not break. The reference states what pruning
depends on; it does not enumerate which alterations defeat it.

### Check 5 - VARCHAR boundary crossing (MySQL)

Per
[innodb-online-ddl-operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html):
"For `VARCHAR` columns of 0 to 255 bytes in size, one length byte is
required to encode the value. For `VARCHAR` columns of 256 bytes in size or
more, two length bytes are required. As a result, in-place `ALTER TABLE`
only supports increasing `VARCHAR` column size from 0 to 255 bytes, or from
256 bytes to a greater size. In-place `ALTER TABLE` does not support
increasing the size of a `VARCHAR` column from less than 256 bytes to a size
equal to or greater than 256 bytes."

So `varchar(100)` to `varchar(500)` crosses the boundary and falls back to a
copy; `varchar(300)` to `varchar(900)` does not. Shrinking is always a copy:
"Decreasing `VARCHAR` size using in-place `ALTER TABLE` is not supported.
Decreasing `VARCHAR` size requires a table copy (`ALGORITHM=COPY`)."

Classify a boundary-crossing widen as category 3 Critical on MySQL, and a
narrowing as category 6 and 7 (a copy plus potential truncation of existing
values). Note that the byte counts are byte sizes, not character counts, so
a multibyte charset reaches 256 bytes at fewer than 256 characters.

## Category 4 and 8: what the foreign key statement actually locks

The source claim worth correcting: on PostgreSQL, `ADD FOREIGN KEY` does
**not** take the default `ACCESS EXCLUSIVE`. Per
[sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html):
"Although most forms of `ADD table_constraint` require an `ACCESS
EXCLUSIVE` lock, `ADD FOREIGN KEY` requires only a `SHARE ROW EXCLUSIVE`
lock. Note that `ADD FOREIGN KEY` also acquires a `SHARE ROW EXCLUSIVE`
lock on the referenced table, in addition to the lock on the table on which
the constraint is declared."

That second sentence is the whole reason category 4 exists: the statement
names one table and locks two, and `SHARE ROW EXCLUSIVE` "protects a table
against concurrent data changes"
([explicit-locking](https://www.postgresql.org/docs/current/explicit-locking.html)),
so writes stop on a table nobody reading the migration would think to check.
Warning, escalating to Critical when the referenced table is a hot write
target.

The two-phase form is the mitigation, and its lock cost is documented:
"With `NOT VALID`, the `ADD CONSTRAINT` command does not scan the table and
can be committed immediately ... validation acquires only a `SHARE UPDATE
EXCLUSIVE` lock on the table being altered. (If the constraint is a foreign
key then a `ROW SHARE` lock is also required on the table referenced by the
constraint.)"
([sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html)).
A migration split into `ADD CONSTRAINT ... NOT VALID` then `VALIDATE
CONSTRAINT` moves from category 4 to category 2.

Category 8 is separate and survives either form. PostgreSQL does not index
the referencing side for you: "Since a `DELETE` of a row from the referenced
table or an `UPDATE` of a referenced column will require a scan of the
referencing table for rows matching the old value, it is often a good idea
to index the referencing columns too"
([ddl-constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)).
An `ADD CONSTRAINT ... FOREIGN KEY (col)` with no index on `col` is a
Warning whose cost lands later, on every delete and key update against the
referenced table.

On MySQL 8.0, the same statement has a different constraint: "The `INPLACE`
algorithm is supported when `foreign_key_checks` is disabled. Otherwise,
only the `COPY` algorithm is supported"
([innodb-online-ddl-operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)).
So on a default MySQL configuration, adding a foreign key is a full table
copy, and belongs in category 3 as well as category 4.

## Category 5, 6, 7: the destructive end

**`DROP COLUMN` is Breaking immediately and Data-loss eventually.** The
data does not go away when you think it does: "The `DROP COLUMN` form does
not physically remove the column, but simply makes it invisible to SQL
operations ... dropping a column is quick but it will not immediately reduce
the on-disk size of your table, as the space occupied by the dropped column
is not reclaimed. The space will be reclaimed over time as existing rows are
updated"
([sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html)).
Classify it Critical for the consumer break, and note that the quick
completion time is not evidence the operation was cheap or reversible.

**`TRUNCATE` is category 6 and category 3 at once.** It "quickly removes
all rows from a set of tables. It has the same effect as an unqualified
`DELETE` on each table, but since it does not actually scan the tables it is
faster. Furthermore, it reclaims disk space immediately", and it "acquires
an `ACCESS EXCLUSIVE` lock on each table it operates on, which blocks all
other concurrent operations on the table"
([sql-truncate](https://www.postgresql.org/docs/current/sql-truncate.html)).
One nuance worth carrying into the finding: on PostgreSQL it is not
unrecoverable mid-transaction, because "`TRUNCATE` is transaction-safe with
respect to the data in the tables: the truncation will be safely rolled back
if the surrounding transaction does not commit."

**Category 7, `ADD COLUMN ... NOT NULL` with no `DEFAULT`.** State the
engine evidence honestly here, because the two engines document it
differently.

- MySQL 8.0 is explicit for the modify form: making a column `NOT NULL`
  "Rebuilds the table in place. `STRICT_ALL_TABLES` or
  `STRICT_TRANS_TABLES` `SQL_MODE` is required for the operation to
  succeed. The operation fails if the column contains NULL values"
  ([innodb-online-ddl-operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)).
- The PostgreSQL `ALTER TABLE` reference does not state the outcome of
  `ADD COLUMN ... NOT NULL` with no `DEFAULT` on a populated table. What it
  does state is the rule the safe pattern rests on: "`SET NOT NULL` may only
  be applied to a column provided none of the records in the table contain a
  `NULL` value for the column. Ordinarily this is checked during the `ALTER
  TABLE` by scanning the entire table ... however, if a valid `CHECK`
  constraint exists (and is not dropped in the same command) which proves no
  `NULL` can exist, then the table scan is skipped"
  ([sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html)),
  alongside the fact that with no column constraints specified "NULL is used
  as the `DEFAULT`".

Classify it Critical, and write the finding as "verify on the target
engine" rather than asserting a failure mode the PostgreSQL reference does
not print. The recommendation is the same either way: add the column
nullable, backfill in batches, then `SET NOT NULL`, ideally behind a `CHECK`
constraint so the final step skips the full scan.

## Per-engine quick reference

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

### The three divergences that flip a severity

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

## Expected output shape

One row per statement, then a count block. Severity, category, and basis
are all required; a row with a severity and no basis is not a
classification.

```
| # | Severity | File:Line | Statement | Category | Basis (engine + version) | Recommendation |
|---|---|---|---|---|---|---|
| 1 | Critical | V42__cleanup.sql:1 | DROP COLUMN users.legacy_status | 5 Breaking, 6 Data-loss | PG 16: column made invisible, space not reclaimed | Stage the drop behind a deprecation release |
| 4 | Critical | V42__cleanup.sql:8 | CREATE INDEX ix_orders_status ON orders (status) | 3 Locking | PG 16: SHARE lock blocks writes for the build; orders 180M rows | Use CREATE INDEX CONCURRENTLY, outside any transaction block |
```

```
Engine: PostgreSQL 16
Size signals: users 40M, orders 180M, products 2M (from V38 data load)

Critical: 3
Warning:  1
Info:     1

Highest-severity category present: 6 Data-loss
Unclassifiable statements: 0
```

If the engine or version could not be established, the block says so and
every version-gated severity is reported as a range, not a value.

## Anti-patterns

- **Classifying a file instead of its statements.** A file gets the
  severity of its worst statement, but the reader needs to know which one.
- **Asserting a lock or rewrite behavior without naming the engine.**
  "This blocks writes" is not a classification. "On PostgreSQL 16 this
  takes a `SHARE` lock, which blocks writes" is.
- **Treating engine behavior as timeless.** Constant-default `ADD COLUMN`
  and instant `ADD COLUMN` both changed inside the supported version
  ranges. A severity that does not carry a version is a guess.
- **Guessing a table size to justify a Critical.** No size signal means
  the finding says "Warning, escalates to Critical above roughly the point
  where the lock hold becomes visible to users; size unverified".
- **Collapsing categories 5 and 6.** A `DROP CONSTRAINT` breaks consumers
  without losing data; a `TRUNCATE` loses data without breaking a schema
  contract. Different mitigations.
- **Reporting only the frightening statements.** Category 1 rows are the
  evidence that the taxonomy was applied to everything.

## Limitations

- The categories cover DDL and bulk DML. They do not cover data
  correctness inside a backfill (whether the `UPDATE` computes the right
  value), or application-level compatibility beyond the schema surface.
- Severity depends on a table size signal this skill does not obtain. It
  tells you which fact you need and what to do when you do not have it.
- Engine coverage here is PostgreSQL and MySQL 8.0 InnoDB, the two whose
  divergence causes the most misclassification. Other engines (SQL Server,
  Oracle, SQLite, MariaDB) need their own lock and rewrite references
  before any severity is assigned; do not transfer a PostgreSQL severity to
  them by analogy.
- MySQL rows above are the 8.0 manual. MySQL 8.4 and later, and MariaDB,
  document their online DDL separately and are not covered by the cited
  page.
