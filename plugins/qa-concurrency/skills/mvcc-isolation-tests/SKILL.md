---
name: mvcc-isolation-tests
description: "Build per-database MVCC transaction isolation-level tests for database concurrency and locking bugs - Read Uncommitted vs Read Committed vs Repeatable Read vs Serializable; verify which anomalies are prevented at each level (dirty read, non-repeatable read, phantom read, serialization anomaly, write skew). Per PostgreSQL transaction isolation docs; with MySQL InnoDB and SQL Server differences. Use when two concurrent transactions can touch the same rows (balance debit, seat booking, stock decrement), or before changing a service's default isolation level. Deadlock detection is out of scope (deadlock-detection-harness); in-process races are race-condition-test-author."
metadata:
  keywords: "mvcc, transaction-isolation, serializable, phantom-read, write-skew"
  version: "1.2.14"
---

# mvcc-isolation-tests

## Overview

Two transactions on two connections, interleaved deterministically
with thread events, prove which anomalies the chosen isolation level
allows and that the application copes. All tests below ran 5/5 green on
PostgreSQL 16 with psycopg 3.

## When to use

- Two transactions can touch the same rows (balance debit, seat
  booking, stock decrement, on-call rota).
- Choosing or changing a service's isolation level.
- Auditing whether "at least one X" invariants survive concurrency.

## Step 1 - Anomalies and the PostgreSQL matrix

| Anomaly | Shape |
|---|---|
| Dirty read | T2 reads T1's uncommitted write |
| Non-repeatable read | T1 reads a row twice; T2 commits an update in between |
| Phantom read | T1 re-runs a predicate query; T2 committed a new matching row |
| Serialization anomaly (write skew) | Both read the same set, each writes a different row on that basis; no serial order gives the result |

| PostgreSQL level | Dirty | Non-repeatable | Phantom | Serialization anomaly |
|---|---|---|---|---|
| Read Uncommitted (acts as Read Committed) | no | yes | yes | yes |
| Read Committed (default) | no | yes | yes | yes |
| Repeatable Read | no | no | no | yes |
| Serializable | no | no | no | no |

Source: [PostgreSQL transaction isolation][pg]. Other databases differ:
[references/per-database.md](references/per-database.md).

## Step 2 - Harness, fixtures and tests

Each test rebuilds the tables and checks the starting row counts
before running, so a failed or aborted test cannot leak state into the
next one. Events and barriers pin the interleaving (no sleeps), every
wait has a timeout, and a hung thread fails the test instead of the
run.

```python
# tests/db/test_isolation.py
import os, threading, time
import psycopg
import pytest
from psycopg import IsolationLevel

DSN = os.environ.get("TEST_DSN", "dbname=test")
WAIT = 5  # seconds; a wait that times out fails the test instead of hanging

SCHEMA = """
DROP TABLE IF EXISTS accounts, orders, doctors;
CREATE TABLE accounts (id text PRIMARY KEY, balance int NOT NULL);
CREATE TABLE orders (id serial PRIMARY KEY, status text NOT NULL);
CREATE TABLE doctors (name text PRIMARY KEY, status text NOT NULL);
INSERT INTO accounts VALUES ('acc1', 100);
INSERT INTO orders (status) VALUES ('pending'), ('pending'), ('pending');
INSERT INTO doctors VALUES ('alice', 'on_call'), ('bob', 'on_call');
"""

def scalar(sql, *args):
    with psycopg.connect(DSN, autocommit=True) as c:
        return c.execute(sql, args).fetchone()[0]

def on_call():
    return scalar("SELECT count(*) FROM doctors WHERE status = 'on_call'")

@pytest.fixture(autouse=True)
def fresh_tables():
    """Rebuild the tables before every test and refuse to run on unexpected state."""
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute(SCHEMA)
    assert scalar("SELECT balance FROM accounts WHERE id = 'acc1'") == 100
    assert scalar("SELECT count(*) FROM orders") == 3
    assert on_call() == 2

def run_pair(work_a, work_b, level):
    """Run two workloads on two connections at `level`; return (results, errors)."""
    conns = [psycopg.connect(DSN) for _ in range(2)]
    for c in conns:
        c.isolation_level = level
    results, errors = {}, {}

    def run(key, conn, work):
        try:
            results[key] = work(conn)
        except Exception as e:          # recorded, asserted by the test
            errors[key] = e
            conn.rollback()

    threads = [threading.Thread(target=run, args=("a", conns[0], work_a)),
               threading.Thread(target=run, args=("b", conns[1], work_b))]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=3 * WAIT)
    assert not any(t.is_alive() for t in threads), "workload hung (lock wait?)"
    for c in conns:
        c.close()
    return results, errors

def test_non_repeatable_read_under_read_committed():
    read1, wrote = threading.Event(), threading.Event()

    def reader(conn):
        first = conn.execute("SELECT balance FROM accounts WHERE id = 'acc1'").fetchone()[0]
        read1.set()
        assert wrote.wait(WAIT)
        second = conn.execute("SELECT balance FROM accounts WHERE id = 'acc1'").fetchone()[0]
        conn.commit()
        return first, second

    def writer(conn):
        assert read1.wait(WAIT)
        conn.execute("UPDATE accounts SET balance = 200 WHERE id = 'acc1'")
        conn.commit()
        wrote.set()

    results, errors = run_pair(reader, writer, IsolationLevel.READ_COMMITTED)
    assert not errors
    assert results["a"] == (100, 200)   # Read Committed allows it

def test_no_phantom_under_repeatable_read():
    read1, wrote = threading.Event(), threading.Event()

    def reader(conn):
        q = "SELECT count(*) FROM orders WHERE status = 'pending'"
        first = conn.execute(q).fetchone()[0]
        read1.set()
        assert wrote.wait(WAIT)
        second = conn.execute(q).fetchone()[0]
        conn.commit()
        return first, second

    def writer(conn):
        assert read1.wait(WAIT)
        conn.execute("INSERT INTO orders (status) VALUES ('pending')")
        conn.commit()
        wrote.set()

    results, errors = run_pair(reader, writer, IsolationLevel.REPEATABLE_READ)
    assert not errors
    assert results["a"] == (3, 3)       # PostgreSQL's snapshot hides the insert
    assert scalar("SELECT count(*) FROM orders") == 4

def take_off(name, both_read):
    def work(conn):
        count = conn.execute("SELECT count(*) FROM doctors WHERE status = 'on_call'").fetchone()[0]
        both_read.wait()                # both transactions have read before either writes
        if count >= 2:
            conn.execute("UPDATE doctors SET status = 'off' WHERE name = %s", (name,))
        conn.commit()
    return work

def test_write_skew_happens_under_repeatable_read():
    both_read = threading.Barrier(2, timeout=WAIT)
    _, errors = run_pair(take_off("alice", both_read), take_off("bob", both_read),
                         IsolationLevel.REPEATABLE_READ)
    assert not errors
    assert on_call() == 0               # the anomaly: nobody on call

def test_serializable_aborts_one_of_the_pair():
    both_read = threading.Barrier(2, timeout=WAIT)
    _, errors = run_pair(take_off("alice", both_read), take_off("bob", both_read),
                         IsolationLevel.SERIALIZABLE)
    assert len(errors) == 1
    assert isinstance(next(iter(errors.values())), psycopg.errors.SerializationFailure)
    assert on_call() == 1

def with_serializable_retry(conn, fn, max_attempts=5):
    """Run fn(conn, attempt) in a SERIALIZABLE transaction, retrying serialization failures."""
    conn.isolation_level = IsolationLevel.SERIALIZABLE
    for attempt in range(1, max_attempts + 1):
        try:
            with conn.transaction():
                return fn(conn, attempt)
        except psycopg.errors.SerializationFailure:
            if attempt == max_attempts:
                raise
            time.sleep(0.01 * 2 ** attempt)

def test_retry_completes_and_keeps_the_invariant():
    both_read = threading.Barrier(2, timeout=WAIT)
    attempts = []

    def take_off_retrying(name):
        def fn(conn, attempt):
            attempts.append((name, attempt))
            count = conn.execute("SELECT count(*) FROM doctors WHERE status = 'on_call'").fetchone()[0]
            if attempt == 1:
                both_read.wait()        # force the conflict only on the first try
            if count >= 2:
                conn.execute("UPDATE doctors SET status = 'off' WHERE name = %s", (name,))
        return lambda conn: with_serializable_retry(conn, fn)

    _, errors = run_pair(take_off_retrying("alice"), take_off_retrying("bob"),
                         IsolationLevel.SERIALIZABLE)
    assert not errors                   # both calls completed
    assert len(attempts) == 3           # exactly one retry
    assert on_call() == 1
```

Run against a throwaway database only: the fixture drops and recreates
the tables.

```bash
TEST_DSN="host=localhost dbname=test_isolation user=postgres" pytest tests/db/test_isolation.py
```

## Step 3 - Map the tests to your workload

Replace `doctors` / `accounts` / `orders` with the tables the real
transactions touch, keeping the same shapes:

| Business invariant | Test shape to copy |
|---|---|
| "Read twice in one request" (report totals, price then charge) | non-repeatable read |
| "Count then act" (capacity, stock, quotas) | phantom + write skew |
| "At least one / at most N" across rows | write skew → Serializable or explicit lock |

Then decide: keep the level and add a constraint or
`SELECT ... FOR UPDATE`, or move the transaction to Serializable and
use the retry wrapper.

## Step 4 - Checkpoint before trusting the suite

1. Each test that asserts an anomaly (`(100, 200)`, `on_call() == 0`)
   must fail when you raise the isolation level by one step. Try it.
2. Run the write-skew pair at Serializable with `run_pair` and expect
   `on_call() == 0`: it must fail, proving the Serializable test can
   see the difference.
3. The retry test must fail if `with_serializable_retry` stops catching
   `SerializationFailure`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `time.sleep()` to order transactions | Flaky on slow CI | Events / barriers with timeouts |
| Asserting "0 or 1" for write skew | Passes whatever happens | Force both reads first; assert the exact outcome |
| Tests sharing rows without a reset | One aborted test breaks the next | Rebuild + count check per test |
| Serializable without a retry loop | Users see 40001 errors | `with_serializable_retry` |
| Serializable everywhere "to be safe" | More aborts and retries under load | Use it where an invariant needs it |
| Testing PostgreSQL, shipping MySQL | Different defaults and locking | [references/per-database.md](references/per-database.md) |

## Limitations

- ORMs can set the isolation level per session or hide it; log the
  SQL the app actually sends.
- Eventually consistent stores need different, probabilistic tests.
- Deadlocks are covered by `deadlock-detection-harness`, not here.

## References

- [PostgreSQL transaction isolation][pg] - anomaly definitions, per-level matrix, serialization failures and retries.
- [psycopg 3 transactions][psycopg-tx] - `isolation_level`, `conn.transaction()`.
- Berenson et al., "A Critique of ANSI SQL Isolation Levels" (SIGMOD 1995) - write skew and snapshot isolation.
- [references/per-database.md](references/per-database.md) - MySQL InnoDB and SQL Server differences.
- Sibling skills: `race-condition-test-author` (in-process races), `deadlock-detection-harness`, `async-ordering-tests`; agent `concurrency-critic`.

[pg]: https://www.postgresql.org/docs/current/transaction-iso.html
[psycopg-tx]: https://www.psycopg.org/psycopg3/docs/basic/transactions.html
