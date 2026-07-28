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

A plain `CREATE INDEX` takes a `SHARE` lock: "Other transactions can still
read the table, but if they try to insert, update, or delete rows in the
table they will block until the index build is finished"
([sql-createindex](https://www.postgresql.org/docs/current/sql-createindex.html),
[explicit-locking](https://www.postgresql.org/docs/current/explicit-locking.html)).
`CREATE INDEX CONCURRENTLY` avoids the write block but "must perform two
scans of the table" and "cannot" run inside a transaction block; on failure
it leaves an "invalid" index that "will still consume update overhead"
([sql-createindex](https://www.postgresql.org/docs/current/sql-createindex.html)).

Classify a plain `CREATE INDEX` on PostgreSQL as category 3: Warning with no
size signal, Critical on a large table. Because the concurrent form cannot
run in a transaction, recommending it also means moving the statement out of
the migration runner's transactional path.

**This check does not transfer to MySQL.** Adding a secondary index on MySQL
8.0 InnoDB is In Place and permits concurrent DML: "The table remains
available for read and write operations while the index is being created"
([innodb-online-ddl-operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)).
A plain `ADD INDEX` is category 1, Info.

### Check 2 - Full table rewrite under an exclusive lock

`ALTER TABLE` takes an `ACCESS EXCLUSIVE` lock "unless explicitly noted",
which "Conflicts with locks of all modes", so it blocks reads as well as
writes ([sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html),
[explicit-locking](https://www.postgresql.org/docs/current/explicit-locking.html)).
A rewrite under that lock is what turns a fast statement into an outage
([sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html)):

- Type change: "Changing the type of an existing column will normally cause
  the entire table and its indexes to be rewritten", except a binary-coercible
  `USING`-less change, which skips the rewrite but still rebuilds indexes.
- Certain defaults: a volatile `DEFAULT`, a stored generated column, an
  identity column, or a constrained domain type "will cause the entire table
  and its indexes to be rewritten"; a virtual generated column never does.

**Version gate.** PostgreSQL 11 added a column with a non-null constant
default "without doing a table rewrite" - the value is stored in the table's
metadata, "making the `ALTER TABLE` very fast even on large tables"
([release 11.0](https://www.postgresql.org/docs/release/11.0/),
[sql-altertable](https://www.postgresql.org/docs/current/sql-altertable.html)).
So `ADD COLUMN x int NOT NULL DEFAULT 0` is category 1 on PostgreSQL 11 and
later, and category 3 Critical on 10 and earlier. Do not classify it without
the version.

**MySQL 8.0 InnoDB divergence.** Type change is worse: "only supported with
`ALGORITHM=COPY`", no concurrent DML, rebuilds the table. Column addition is
better: `INSTANT` is default from 8.0.12 (`INPLACE` before), last position
only before 8.0.29; the `INPLACE` fallback still rebuilds, and concurrent DML
"is not permitted when adding an auto-increment column"
([innodb-online-ddl-operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)).

### Check 3 - Statistics gap after a large data change

`ANALYZE` refreshes the planner statistics in `pg_statistic`, and "When
autovacuum is disabled, it is a good idea to run `ANALYZE` periodically, or
just after making major changes in the contents of a table"
([sql-analyze](https://www.postgresql.org/docs/current/sql-analyze.html)).
Running it at the end of a bulk-load migration **even when autovacuum is
enabled** is a practitioner convention, not a documented requirement. Flag
its absence after a bulk `INSERT`, `UPDATE`, or `DELETE` as Warning, and say
which it is: a documented gap if autovacuum is off on the target, a
convention otherwise.

### Check 4 - Partition key touched

Partition pruning "is driven only by the constraints defined implicitly by
the partition keys, not by the presence of indexes"
([ddl-partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)).
So any statement that changes the partition key column (its type, its
semantics, or the partitioning expression) puts every pruned plan at risk,
and no index can compensate. Classify a statement touching a column named in
`PARTITION BY RANGE / LIST / HASH (...)` as category 3, Warning, and require
a plan check (compare `EXPLAIN` before and after) rather than asserting
whether pruning breaks.

### Check 5 - VARCHAR boundary crossing (MySQL)

`VARCHAR` needs one length byte below 256 bytes and two at 256 or more, so
"in-place `ALTER TABLE` does not support increasing the size of a `VARCHAR`
column from less than 256 bytes to a size equal to or greater than 256
bytes"; decreasing size "requires a table copy (`ALGORITHM=COPY`)"
([innodb-online-ddl-operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)).
So `varchar(100)` to `varchar(500)` crosses the boundary and copies;
`varchar(300)` to `varchar(900)` does not. Classify a boundary-crossing
widen as category 3 Critical on MySQL, a narrowing as category 6 and 7 (a
copy plus potential truncation). Byte counts are bytes, not characters, so a
multibyte charset reaches 256 bytes at fewer than 256 characters.

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

The consolidated PostgreSQL and MySQL 8.0 InnoDB lock / rewrite tables, and
the three divergences that flip a severity, are in
[references/engine-quick-reference.md](references/engine-quick-reference.md).
A full worked classification (PostgreSQL 16, five statements across `users`,
`orders`, `products`) is in the same file.

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
