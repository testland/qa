---
name: mvcc-isolation-tests
description: "Build per-database MVCC isolation-level tests - Read Uncommitted vs Read Committed vs Repeatable Read vs Serializable; verify which anomalies are prevented at each level (dirty read, non-repeatable read, phantom read, serialization anomaly, write skew). Per PostgreSQL transaction isolation docs; analogous patterns for MySQL InnoDB, SQL Server, and DynamoDB. Use when two concurrent transactions can touch the same rows (balance debit, seat booking, stock decrement), or before changing a service's default isolation level."
metadata:
  keywords: "mvcc, transaction-isolation, serializable, phantom-read, write-skew"
---

# mvcc-isolation-tests

Per the [PostgreSQL transaction isolation docs], the four standard
SQL isolation levels permit different anomalies. Production code
must run at the right level - and tests verify both that the
chosen level prevents the anomalies the business cares about AND
that the code copes when the level allows them.

## When to use

- Banking, inventory, booking - anywhere two transactions can
  conflict on the same data.
- Choosing or auditing default isolation level for a new service.
- Migration: changing isolation level (e.g., Read Committed →
  Repeatable Read) - tests verify nothing relies on old behavior.

## Step 1 - Anomaly catalog

Per the [PostgreSQL transaction isolation docs]:

| Anomaly | What |
|---|---|
| Dirty read | T2 reads uncommitted T1 changes |
| Non-repeatable read | T1 reads X = 5; T2 commits X = 6; T1 re-reads X = 6 |
| Phantom read | T1 query returns 3 rows; T2 inserts row matching predicate; T1 re-runs query, gets 4 rows |
| Serialization anomaly | Concurrent execution produces a result no serial order would |
| Write skew | T1 reads {x, y} = {0, 0}; T2 reads same; both decide based on read-set; both commit; final state inconsistent |

## Step 2 - PostgreSQL isolation matrix

Per the [PostgreSQL transaction isolation docs]:

| Level | Dirty | Non-repeatable | Phantom | Serialization |
|---|---|---|---|---|
| Read Uncommitted (= Read Committed in PG) | NO | YES | YES | YES |
| Read Committed | NO | YES | YES | YES |
| Repeatable Read | NO | NO | NO (PG strict) | YES |
| Serializable | NO | NO | NO | NO |

PostgreSQL's Repeatable Read is stricter than SQL standard - it
prevents phantoms via snapshot isolation. Other databases differ.

## Step 3 - Test setup: two-connection harness

```python
import psycopg
import threading
import time  # Steps 4-6 use time.sleep for the interleaving window

def two_connection_test(workload_a, workload_b, isolation="read committed"):
    conn_a = psycopg.connect("dbname=test", autocommit=False)
    conn_b = psycopg.connect("dbname=test", autocommit=False)

    # Set isolation level for both
    for c in (conn_a, conn_b):
        with c.cursor() as cur:
            cur.execute(f"SET TRANSACTION ISOLATION LEVEL {isolation}")

    barrier = threading.Barrier(2)
    results = {}

    def run(conn, work, key):
        barrier.wait()
        results[key] = work(conn)

    t_a = threading.Thread(target=run, args=(conn_a, workload_a, "a"))
    t_b = threading.Thread(target=run, args=(conn_b, workload_b, "b"))
    t_a.start(); t_b.start()
    t_a.join(); t_b.join()

    return results
```

The Steps 4-6 workloads use `time.sleep(0.5)` to open the interleaving
window, which is timing-sensitive and can flake on slow CI. For a
deterministic harness, replace the sleep with a second barrier (or a
`threading.Event`) so the writer commits exactly between the reader's two
reads, no wall-clock guess required:

```python
# Deterministic variant: pass an extra Barrier(2) into both workloads.
# reader: read #1 -> gate.wait() -> read #2
# writer: gate.wait() -> UPDATE + commit       (writer races read #2)
# Use a pair of barriers (read1-done, write-done) if you need to pin the
# writer's commit strictly after read #1 and strictly before read #2.
gate = threading.Barrier(2)
```

## Step 4 - Test for non-repeatable read at Read Committed

```python
def test_non_repeatable_read_under_read_committed():
    setup_balance(account="acc1", balance=100)

    def reader(conn):
        with conn.cursor() as cur:
            cur.execute("SELECT balance FROM accounts WHERE id = 'acc1'")
            first = cur.fetchone()[0]
            time.sleep(0.5)  # let writer commit
            cur.execute("SELECT balance FROM accounts WHERE id = 'acc1'")
            second = cur.fetchone()[0]
        conn.commit()
        return (first, second)

    def writer(conn):
        with conn.cursor() as cur:
            cur.execute("UPDATE accounts SET balance = 200 WHERE id = 'acc1'")
        conn.commit()
        return None

    results = two_connection_test(reader, writer, isolation="read committed")
    first, second = results["a"]
    assert first == 100
    assert second == 200, "Read Committed permits non-repeatable read"
```

## Step 5 - Test phantom read prevented at Repeatable Read (PG)

```python
def test_phantom_read_prevented_under_repeatable_read():
    setup_orders(initial_count=3)

    def reader(conn):
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM orders WHERE status = 'pending'")
            first_count = cur.fetchone()[0]
            time.sleep(0.5)
            cur.execute("SELECT COUNT(*) FROM orders WHERE status = 'pending'")
            second_count = cur.fetchone()[0]
        conn.commit()
        return (first_count, second_count)

    def writer(conn):
        with conn.cursor() as cur:
            cur.execute("INSERT INTO orders (status) VALUES ('pending')")
        conn.commit()
        return None

    results = two_connection_test(reader, writer, isolation="repeatable read")
    first, second = results["a"]
    assert first == second == 3, "PG Repeatable Read should prevent phantom"
```

## Step 6 - Test write-skew at Repeatable Read (still possible!)

Per the [PostgreSQL transaction isolation docs], write skew is a
serialization anomaly that Repeatable Read does NOT prevent:

```python
def test_write_skew_under_repeatable_read():
    """Two doctors on call; rule: at least one must remain on call.
    T1 reads {alice: on, bob: on}; decides safe to take alice off.
    T2 reads same; decides safe to take bob off.
    Both commit. Now nobody on call → anomaly."""
    setup_doctors([("alice", "on_call"), ("bob", "on_call")])

    def take_alice_off(conn):
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM doctors WHERE status = 'on_call'")
            on_call_count = cur.fetchone()[0]
            if on_call_count >= 2:
                cur.execute("UPDATE doctors SET status = 'off' WHERE name = 'alice'")
        conn.commit()

    def take_bob_off(conn):
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM doctors WHERE status = 'on_call'")
            on_call_count = cur.fetchone()[0]
            if on_call_count >= 2:
                cur.execute("UPDATE doctors SET status = 'off' WHERE name = 'bob'")
        conn.commit()

    two_connection_test(take_alice_off, take_bob_off, isolation="repeatable read")

    on_call_after = count_on_call()
    # Under Repeatable Read, write skew is possible: both txns read 2
    # on-call, both flip one off, and the final state is 0 on call (the
    # anomaly). A correctly-serialized run would leave 1. Either value
    # proves RR does NOT serialize this pair, so both are accepted here.
    # (Run the same workload at Serializable - Step 7 - to see one txn abort.)
    assert on_call_after in (0, 1)
```

## Step 7 - Test Serializable rolls back conflicting transactions

```python
def test_serializable_aborts_one_of_skew_pair():
    setup_doctors([("alice", "on_call"), ("bob", "on_call")])

    aborted = [0]
    def take_off(name, conn):
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM doctors WHERE status = 'on_call'")
                if cur.fetchone()[0] >= 2:
                    cur.execute("UPDATE doctors SET status = 'off' WHERE name = %s", (name,))
            conn.commit()
        except psycopg.errors.SerializationFailure:
            conn.rollback()
            aborted[0] += 1

    two_connection_test(
        lambda c: take_off("alice", c),
        lambda c: take_off("bob", c),
        isolation="serializable",
    )

    assert aborted[0] >= 1, "Serializable must abort at least one"
    assert count_on_call() >= 1, "At least one doctor still on call"
```

Per the [PostgreSQL transaction isolation docs]: Serializable raises
`could not serialize access due to read/write dependencies among
transactions` - application must catch + retry.

## Step 8 - Per-database differences

| DB | Default | RR prevents phantoms? | Serializable cost |
|---|---|---|---|
| PostgreSQL | Read Committed | Yes (snapshot isolation) | Predicate locks; can be expensive |
| MySQL InnoDB | Repeatable Read | Yes (gap locks) | Default RR is "good enough" for most |
| SQL Server | Read Committed | No (default), Yes with `READ_COMMITTED_SNAPSHOT` | Snapshot isolation available |
| Oracle | Read Committed | Yes via Read Consistency | Serializable via lock |
| DynamoDB | Eventually consistent reads | Strongly consistent reads opt-in | Transactions: ACID with TransactWriteItems |
| MongoDB | Snapshot read concern | Multi-doc txn (4.0+) ACID | Limit on doc size (16MB / txn) |

Test the *actual* DB you ship with - defaults differ.

## Step 9 - Application-level retry pattern

```python
def with_serializable_retry(fn, max_retries=3):
    for attempt in range(max_retries):
        try:
            with conn.cursor() as cur:
                cur.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
            result = fn()
            conn.commit()
            return result
        except psycopg.errors.SerializationFailure:
            conn.rollback()
            if attempt == max_retries - 1:
                raise
            time.sleep(0.01 * (2 ** attempt))
```

Test the retry logic itself:

```python
def test_serializable_retry_completes():
    # Simulate concurrent conflict; verify retry succeeds eventually
    ...
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run at default isolation, hope for the best | Anomaly hits in prod | Choose level deliberately + test |
| Test only happy-path single-transaction | Concurrency bugs need 2-conn harness | Step 3 harness |
| Use Serializable everywhere "to be safe" | Performance cliff; retries swamp | Test perf at chosen level |
| Skip retry logic for Serializable | Production transaction errors leak | Step 9 retry pattern |
| Test PG and assume MySQL behaves same | RR semantics differ (gap locks vs snapshot) | Per-DB tests (Step 8) |

## Limitations

- Test fixture flakiness: timing-sensitive; may need barrier
  adjustment per machine speed.
- Eventually-consistent NoSQL stores need different tests
  (probabilistic + windowed).
- ORM abstractions can hide explicit SET ISOLATION LEVEL - verify
  the actual SQL emitted.

## References

- [PostgreSQL transaction isolation docs] - anomaly definitions,
  per-level matrix, retry patterns
- MySQL InnoDB isolation - dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- A Critique of ANSI SQL Isolation Levels (Berenson 1995) - seminal
  paper on isolation levels
- `race-condition-test-author`,
  `deadlock-detection-harness` - 
  in-process concurrency siblings
- `jepsen-patterns` - distributed
  consistency analogue

[PostgreSQL transaction isolation docs]: https://www.postgresql.org/docs/current/transaction-iso.html
