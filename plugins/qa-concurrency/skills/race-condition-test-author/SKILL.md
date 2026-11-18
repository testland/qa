---
name: race-condition-test-author
description: "Use when a bug only appears under load on shared in-process state (cache, counter, pool, lazy singleton), or a race needs a regression test before the fix. Forces interleavings with barriers and latches, and runs ThreadSanitizer, go test -race with goleak, or jcstress for the JVM."
metadata:
  keywords: "race-condition, data-race, thread-sanitizer, jcstress, concurrency-testing"
  version: "1.2.18"
---

# race-condition-test-author

## Overview

Two complementary tools: a deterministic test that forces the bad
interleaving with a start gate (or a hook inside the critical window),
and a detector or stress harness (TSan, `go test -race`, jcstress) that
explores interleavings you did not think of. A race fix is done when a
test that failed before the fix passes after it, repeatedly.

## When to use

- A defect reproduces only under load on shared in-process state
  (cache, counter, pool, lazy singleton).
- A race incident needs a regression test before the fix lands.
- Adding a race detector to CI, or finding out why the existing one
  never fails.

## Step 1 - Find the shared mutable state

Check each of: module-level / static mutable variables; singletons
with mutable fields; get-then-set on caches or maps without a lock or
CAS; per-request data stored on shared objects; pools; lazy
initialisation ("if not initialised, initialise"). For each, write
down the two operations that must not interleave.

## Step 2 - Force the interleaving

A start gate makes both threads enter together; a hook inside the
window makes the collision certain instead of likely:

```python
import threading

def test_lazy_init_creates_one_instance(monkeypatch):
    in_window = threading.Barrier(2, timeout=0.5)
    real_build = LazyService._build

    def slow_build(self):
        try:
            in_window.wait()      # unfixed: both threads meet here, inside the window
        except threading.BrokenBarrierError:
            pass                  # fixed: only one thread gets here; carry on
        return real_build(self)

    monkeypatch.setattr(LazyService, "_build", slow_build)
    target = LazyService()
    results, errors = [None, None], []

    def worker(i):
        try:
            results[i] = target.lazy_get()
        except Exception as e:    # surface worker failures to the test thread
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in (0, 1)]
    for t in threads: t.start()
    for t in threads: t.join(timeout=10)
    assert not errors
    assert results[0] is results[1], "lazy init built two instances"
```

Verified with a check-then-build `LazyService`: the unfixed code fails
3/3 runs (both threads meet inside the window and build twice); with a
lock around check-and-build it passes 3/3, because only one thread
reaches `_build` and its barrier wait times out after 0.5 s. The same
test serves before and after the fix.

Assertions belong on the test thread. An assertion or `t.Fatal`
inside a worker thread, goroutine or executor task can fail silently;
collect results and errors and assert after `join()`.

### When the shared state is not in process memory

**A database row.** Read-then-write in application code (`SELECT` the
balance, check it, `UPDATE` with the computed value) races across
connections, processes and pods, so a Python or Java lock cannot fix it.

- Test on the engine production uses, with two separate connections. SQLite
  "implements serializable transactions by actually serializing the writes.
  There can only be a single writer at a time" ([sqlite-iso]), and a test
  that shares one connection (for example SQLAlchemy `StaticPool`)
  serializes the calls anyway. Either setup passes a test that Postgres or
  MySQL fails.
- Force the interleaving the same way as above: a barrier or hook between
  the read and the write, so both connections read before either writes.
- Fix it in the database: one conditional statement
  (`UPDATE coupons SET uses_left = uses_left - 1 WHERE code = :c AND uses_left > 0`,
  then check the row count), or `SELECT ... FOR UPDATE` before the check. In
  Postgres Read Committed, a blocked `UPDATE` re-evaluates its `WHERE` clause
  on the committed row version ([pg-iso]). Under Repeatable Read the loser
  gets "could not serialize access due to concurrent update" and must retry
  the whole transaction ([pg-iso]). Isolation-level testing in depth:
  `mvcc-isolation-tests`.

**asyncio coroutines.** One event loop thread still races: a coroutine can
only be interrupted at an `await`, so `if cache is None: cache = await
load()` lets every caller that arrives during `load()` start its own load.

- A fake that returns without awaiting never suspends, so no other coroutine
  ever runs inside the window and the test cannot fail. Make the fake wait
  on an `asyncio.Event` that the test sets once all callers are waiting,
  rather than `asyncio.sleep(0.01)`, which is the timing bet from the
  anti-patterns table in coroutine form.
- Fix with an `asyncio.Lock` and re-check the state inside it (asyncio
  primitives "are not thread-safe" and threading locks block the loop
  ([asyncio-sync])), or share one in-flight `asyncio.Task` between callers.
- If you share an in-flight task, clear it in `finally`. Otherwise a failed
  load stays cached and every later caller gets the same exception until a
  restart. Add a test where the first load raises and the next call
  succeeds.

```python
import asyncio

class ConfigCache:
    def __init__(self, loader):
        self._loader, self._value, self._lock = loader, None, asyncio.Lock()

    async def get(self):
        if self._value is None:
            async with self._lock:
                if self._value is None:        # re-check: another caller may have loaded it
                    self._value = await self._loader()
        return self._value
```

## Step 3 - Detectors: TSan and Go `-race`

C / C++ ([ThreadSanitizer][tsan]):

```bash
clang -fsanitize=thread -g -O1 program.c -o program
TSAN_OPTIONS="halt_on_error=0" ./program; echo "exit=$?"
```

TSan typically costs 5-15x time and 5-10x memory ([ThreadSanitizer][tsan]).
A report changes the exit status to `exitcode` (default 66); setting
`exitcode=0` in CI makes a run that found races pass
([TSan flags][tsan-flags]). Never suppress a finding to get green: a
suppression is for third-party code you cannot change, with a ticket.
`TSAN_OPTIONS=enable_adaptive_delay=1` injects delays at
synchronisation points to expose more interleavings ([ThreadSanitizer][tsan]).

Go: `go test -race ./...`. The race detector needs cgo, and typically
costs 5-10x memory and 2-20x time ([Go race detector][go-race]). The full
Go workflow (GORACE, `-count` / `-cpu` stress, start gates with
channels, goroutine-leak gating with goleak) is in
[references/go.md](references/go.md); goleak filter choices are in
[references/goleak-filter-options.md](references/goleak-filter-options.md).
The race detector finds unsynchronised memory access only; it says
nothing about goroutines that never exit.

## Step 4 - jcstress for JVM publication and reordering

jcstress runs `@Actor` methods concurrently on a fresh `@State`
object per trial and classifies results with `@Outcome`
([jcstress][jcstress]). Put the shared field on the state object so
every trial publishes it anew, and mark the illegal observation
`FORBIDDEN` so one occurrence fails the run:

```java
import org.openjdk.jcstress.annotations.*;
import org.openjdk.jcstress.infra.results.II_Result;
import static org.openjdk.jcstress.annotations.Expect.*;

@JCStressTest
@Outcome(id = "0, 0", expect = ACCEPTABLE, desc = "Nothing seen yet")
@Outcome(id = "1, 1", expect = ACCEPTABLE, desc = "Both writes seen")
@Outcome(id = "0, 1", expect = ACCEPTABLE, desc = "Only x seen")
@Outcome(id = "1, 0", expect = FORBIDDEN,  desc = "y seen without x")
@State
public class PublicationTest {
    volatile int x, y;           // remove volatile to watch 1, 0 become possible

    @Actor public void writer() { x = 1; y = 1; }
    @Actor public void reader(II_Result r) { r.r1 = y; r.r2 = x; }
}
```

```bash
java -jar target/jcstress.jar -t PublicationTest
```

A clean jcstress run means the forbidden outcome was not observed in
the interleavings explored, not that it cannot happen; say so when
closing a ticket.

## Step 5 - Volume: virtual threads and property tests

Virtual threads (Java 21+) make thousands of concurrent tasks cheap:

```java
@Test
void placesTenThousandOrdersWithoutLoss() throws Exception {
    var service = new OrderService();
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
        var futures = IntStream.range(0, 10_000)
            .mapToObj(i -> executor.submit(() -> service.place(i)))
            .toList();
        for (var f : futures) f.get();   // rethrows task failures here
    }
    assertEquals(10_000, service.totalProcessed());
}
```

Property-based concurrency (Hypothesis) checks invariants over random
operation mixes:

```python
import threading
from hypothesis import assume, given, strategies as st

@given(st.lists(st.tuples(st.sampled_from(["read", "write"]), st.integers()), min_size=10, max_size=100))
def test_counter_ends_on_a_written_value(ops):
    writes = [v for op, v in ops if op == "write"]
    assume(writes)
    counter = ThreadSafeCounter()
    threads = [threading.Thread(target=(lambda v=v: counter.set(v)) if op == "write" else counter.get)
               for op, v in ops]
    for t in threads: t.start()
    for t in threads: t.join()
    assert counter.get() in writes
```

Volume tests raise the odds; they never prove absence. Pair them with
Step 2 for the specific bug.

## Step 6 - Checkpoint: red before the fix, green after

1. Run the new test against the unfixed code: it must fail. Record the
   observed numbers (for example "expected 10,000, got 9,412 over 50
   rounds") in the ticket.
2. Apply the fix; run the test repeatedly (`-count=50`,
   `pytest --count=50` with pytest-repeat, or rounds inside the test):
   it must pass every time.
3. If step 1 passed, the test does not reach the race. Widen the window
   (Step 2 hook), move the gate closer to the critical section, or add
   `-cpu 1,2,4` / more rounds, and repeat step 1.

## Step 7 - CI

```yaml
- name: Go race detector
  env: { CGO_ENABLED: "1" }
  run: go test -race -count=3 -cpu 1,4 -timeout 20m ./...

- name: TSan build + test
  run: |
    cmake -B build-tsan -DCMAKE_C_FLAGS="-fsanitize=thread -g -O1" -DCMAKE_CXX_FLAGS="-fsanitize=thread -g -O1"
    cmake --build build-tsan
    ./build-tsan/test_runner        # non-zero (66) when TSan reports

- name: jcstress
  run: java -jar target/jcstress.jar -t PublicationTest
```

Keep at least one instrumented matrix leg; never mark it
`continue-on-error`, and never set `exitcode=0`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `sleep()` to "force" interleaving | Flaky; passes on fast machines | Start gate or in-window hook (Step 2) |
| Database race tested on SQLite or one shared connection | Writes are serialized, so the race never happens in the test | Production engine, two connections, fix in SQL (Step 2) |
| Python lock around a read-then-write on a database row | Other processes and pods do not share the lock | Conditional `UPDATE` or `SELECT ... FOR UPDATE` (Step 2) |
| Assertions inside worker threads / goroutines | Failures vanish; test passes | Collect, then assert on the test thread |
| One green run after the fix | Races are probabilistic | Repeated runs (Step 6) |
| Detector step `continue-on-error` or `exitcode=0` | Findings never fail the build | Blocking step (Step 7) |
| Suppressing a finding in your own code | Ships the race | Fix it, or ticket + owner |
| Build tag excluding concurrent tests from `-race` | The detector never sees the contended code | Run them under `-race` |

## Limitations

- TSan and `-race` find data races, not logical races in correctly
  synchronised multi-step operations; Step 2 tests cover those.
- jcstress is JVM-only.
- Database-level races between transactions belong to
  `mvcc-isolation-tests`.

## References

- [tsan] - clang `-fsanitize=thread`, runtime
  options, adaptive delay
- [jcstress] - `@JCStressTest`, `@Actor`, `@Outcome` outcomes
- [TSan flags][tsan-flags] - `exitcode` (default 66), `halt_on_error`, `suppressions`
- [Go race detector][go-race] - overhead, cgo requirement, GORACE
- ThreadSanitizer C++ Manual - github.com/google/sanitizers/wiki/ThreadSanitizerCppManual
- [references/go.md](references/go.md) - Go race detector + goleak
  workflow (GORACE, stress, CI matrix)
- [references/goleak-filter-options.md](references/goleak-filter-options.md) - goleak ignore options
- `deadlock-detection-harness` - 
  sister skill for deadlock-specific patterns
- `async-ordering-tests` - 
  sister skill for async/await ordering
- `mvcc-isolation-tests` - database transaction races
- [SQLite isolation][sqlite-iso] - one writer at a time
- [PostgreSQL transaction isolation][pg-iso] - concurrent `UPDATE` under Read Committed and Repeatable Read
- [asyncio synchronization primitives][asyncio-sync] - `asyncio.Lock`, not thread-safe

[tsan]: https://clang.llvm.org/docs/ThreadSanitizer.html
[tsan-flags]: https://github.com/google/sanitizers/wiki/ThreadSanitizerFlags
[go-race]: https://go.dev/doc/articles/race_detector
[jcstress]: https://github.com/openjdk/jcstress
[sqlite-iso]: https://www.sqlite.org/isolation.html
[pg-iso]: https://www.postgresql.org/docs/current/transaction-iso.html
[asyncio-sync]: https://docs.python.org/3/library/asyncio-sync.html
