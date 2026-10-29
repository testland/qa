# Isolation behaviour by database

Companion to `mvcc-isolation-tests`. Defaults and anomalies differ, so
port the SKILL.md tests to the database you ship and re-check each
expectation; do not assume PostgreSQL results carry over.

| Database | Default level | Repeatable Read and phantoms | Notes |
|---|---|---|---|
| PostgreSQL | Read Committed | No phantoms (snapshot); write skew still possible | Read Uncommitted behaves as Read Committed; Serializable aborts with SQLSTATE 40001 and the app retries ([PostgreSQL][pg]) |
| MySQL InnoDB | Repeatable Read | Plain reads use the snapshot from the first read; locking reads and `UPDATE` / `DELETE` take gap or next-key locks | Mixing plain and locking reads in one transaction reads two different states; Serializable turns plain `SELECT` into `SELECT ... FOR SHARE` when autocommit is off ([MySQL][mysql]) |
| SQL Server | Read Committed (`READ_COMMITTED_SNAPSHOT` off on SQL Server, on in Azure SQL Database) | Phantoms allowed; only Serializable blocks them with range locks | With RCSI on, Read Committed reads a per-statement row-version snapshot instead of taking shared locks; `SNAPSHOT` needs `ALLOW_SNAPSHOT_ISOLATION` on ([SQL Server][mssql]) |

## Porting the tests

- **MySQL:** the non-repeatable-read test needs `READ COMMITTED` (the
  default Repeatable Read prevents it). The write-skew pair under
  Repeatable Read with plain `SELECT` behaves as in PostgreSQL; with
  `SELECT ... FOR UPDATE` the second transaction blocks instead, so the
  harness's hang check fires - assert the block, not the skew.
- **SQL Server:** run the suite once with RCSI off and once with it on
  if production uses Azure SQL Database; Read Committed results differ.
- **Serializable failures:** PostgreSQL raises SQLSTATE 40001
  (`SerializationFailure`); MySQL and SQL Server report deadlock or
  lock-timeout errors instead. Retry on the error your driver raises.

[pg]: https://www.postgresql.org/docs/current/transaction-iso.html
[mysql]: https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html
[mssql]: https://learn.microsoft.com/en-us/sql/t-sql/statements/set-transaction-isolation-level-transact-sql
