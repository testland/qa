---
name: race-condition-test-author
description: "Build deterministic race-condition tests - identify shared mutable state, drive interleavings via barriers / latches / manual scheduling; use ThreadSanitizer (clang `-fsanitize=thread`) for C/C++/Go data race detection; use jcstress (`@JCStressTest` + `@Actor` + `@Outcome`) for JVM stress; use Loom virtual-thread interleavings for parallel testing. Use when a defect only reproduces under load on shared in-process state (cache, counter, connection pool, lazy-init singleton), or when writing the regression test for a race-condition incident before the fix lands."
metadata:
  keywords: "race-condition, data-race, thread-sanitizer, jcstress, concurrency-testing"
---

# race-condition-test-author

Race conditions are the canonical "works on my machine, breaks under
load" bug. Tests must drive shared-state access deterministically
(barriers, latches) AND non-deterministically (sanitizers, stress)
to expose them.

## When to use

- Service handles concurrent requests on shared in-process state
  (caches, counters, connection pools).
- Race-condition incident retro: build a regression test before
  fixing.
- Pre-release smoke: TSan-instrumented binary catches data races
  that compile clean.

## Step 1 - Identify shared mutable state

Code-review checklist:

- Static / global / module-level mutable variables
- Singleton instances with mutable fields
- Cache structures with read-and-modify ("get-then-set" without
  CAS)
- Per-request state stored on shared objects (mutable request
  context)
- Connection pools / object pools without internal lock
- Lazy-init patterns ("if not initialized, initialize")

For each: ask "what if two threads / goroutines / async tasks hit
this concurrently?"

## Step 2 - Deterministic interleaving via barriers

```python
import threading

def test_lazy_init_thread_safe():
    target = LazyService()  # has private _instance + lazy_get()
    barrier = threading.Barrier(parties=2)
    results = [None, None]

    def worker(idx):
        barrier.wait()  # both threads stop here, then race
        results[idx] = target.lazy_get()

    t1 = threading.Thread(target=worker, args=(0,))
    t2 = threading.Thread(target=worker, args=(1,))
    t1.start(); t2.start()
    t1.join(); t2.join()

    assert results[0] is results[1], "Lazy init created two instances under race"
```

Barrier ensures both threads start the contended section at the
same time - much higher probability of triggering the race than
naive `threading.Thread()`.

## Step 3 - ThreadSanitizer for C/C++/Go

Per the [ThreadSanitizer docs], TSan detects data races at runtime
with ~5-15× overhead. For C/C++:

```bash
clang -fsanitize=thread -g -O1 program.c -o program
./program
```

For Go, native data race detector:

```bash
go test -race ./...
go run -race main.go
```

Output for a detected race:

```
WARNING: DATA RACE
Read at 0x... by goroutine 7:
  main.read+0x...
    main.go:42

Previous write at 0x... by goroutine 6:
  main.write+0x...
    main.go:38
```

Per the [ThreadSanitizer docs], adaptive delay injection
(`TSAN_OPTIONS=enable_adaptive_delay=1`) helps surface races at
synchronization points.

## Step 4 - jcstress for JVM

Per the [jcstress docs], jcstress is "the experimental harness ... for
the correctness of concurrency support in the JVM."

```java
@JCStressTest
@Outcome(id = "0, 0", expect = ACCEPTABLE, desc = "Initial values")
@Outcome(id = "1, 1", expect = ACCEPTABLE, desc = "Both writes seen")
@Outcome(id = "0, 1", expect = ACCEPTABLE, desc = "Saw partial")
@Outcome(id = "1, 0", expect = FORBIDDEN, desc = "Reordered - bug")
@State
public class CounterTest {
    int x, y;

    @Actor
    public void writer() { x = 1; y = 1; }

    @Actor
    public void reader(II_Result r) {
        r.r1 = y;
        r.r2 = x;
    }
}
```

`@Actor` methods run concurrently on different threads; `@Outcome`
classifies observed `(r1, r2)` pairs. `FORBIDDEN` outcomes indicate
a memory-model violation (in this case, reordering allowed under JMM
unless `volatile` or `final`).

Run:

```bash
java -jar jcstress.jar -m quick CounterTest
```

Per the [jcstress docs]: tests are probabilistic; longer runs find
more reorderings.

## Step 5 - Loom virtual-thread interleavings (Java 21+)

Java 21+ Project Loom enables cheap virtual threads. Use to test
many-concurrent-task interleavings without OS thread cost:

```java
@Test
void test_handles_10000_concurrent_orders() throws Exception {
    var orderService = new OrderService();
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
        var futures = IntStream.range(0, 10_000)
            .mapToObj(i -> executor.submit(() -> orderService.place(i)))
            .toList();
        for (var f : futures) f.get();
    }
    assertEquals(10_000, orderService.totalProcessed());
}
```

Virtual threads run M:N on OS threads - the JVM scheduler interleaves
them aggressively, exposing schedule-dependent races.

## Step 6 - Property-based + concurrency

Combine Hypothesis (Python) / fast-check (JS) with concurrency:

```python
from hypothesis import given, strategies as st
import threading

@given(operations=st.lists(st.tuples(st.sampled_from(["read", "write"]), st.integers()), min_size=10, max_size=100))
def test_counter_property_under_concurrency(operations):
    counter = ThreadSafeCounter()
    threads = []
    for op, val in operations:
        if op == "write":
            threads.append(threading.Thread(target=lambda v=val: counter.set(v)))
        else:
            threads.append(threading.Thread(target=counter.get))

    for t in threads: t.start()
    for t in threads: t.join()

    # Property: final value is one of the written values
    assert counter.get() in [v for op, v in operations if op == "write"]
```

Cross-ref `qa-property-based` plugin for property-based test
authoring patterns.

## Step 7 - CI integration

```yaml
# Go
- name: Run race detector
  run: go test -race ./...

# C/C++
- name: TSan build + test
  run: |
    cmake -B build -DCMAKE_C_FLAGS="-fsanitize=thread -g -O1"
    cmake --build build
    ./build/test_runner

# Java
- name: jcstress quick run
  run: java -jar jcstress.jar -m quick -r results/
```

Note the latency cost: `go test -race` ~3× slower; jcstress quick
mode ~minutes per test class.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `time.sleep(0.001)` to "force" interleaving | Non-deterministic; flake | Use barriers (Step 2) |
| Run race tests once and assume green | Probabilistic; some races take hours | Multiple runs OR longer runs OR sanitizers |
| Skip TSan in CI for "release" builds | Race in release; CI passed without `-race` | TSan in CI for at least one matrix dimension (Step 7) |
| Depend on assertion in worker thread | Thread death silent; main thread sees pass | Use futures + assert from main |
| Test only the bug-causing race, not similar | Other shared state has same pattern; bugs ship | Code-review checklist (Step 1) |

## Limitations

- TSan finds only data races (unsynchronized concurrent access),
  not higher-level race conditions (correct-but-non-atomic
  multi-step operations).
- jcstress is JVM-only; no equivalent for non-JVM stacks.
- Go's `-race` overhead is real (~5-10× memory); CI matrix
  budget required.
- Loom virtual threads (Java 21+) require recent JDK; older
  versions need OS threads.

## References

- [ThreadSanitizer docs] - clang `-fsanitize=thread`, runtime
  options, adaptive delay
- [jcstress docs] - `@JCStressTest`, `@Actor`, `@Outcome` outcomes
- ThreadSanitizer C++ Manual - github.com/google/sanitizers/wiki/ThreadSanitizerCppManual
- `deadlock-detection-harness` - 
  sister skill for deadlock-specific patterns
- `async-ordering-tests` - 
  sister skill for async/await ordering
- `jepsen-patterns` - distributed
  consistency testing alternative

[ThreadSanitizer docs]: https://clang.llvm.org/docs/ThreadSanitizer.html
[jcstress docs]: https://github.com/openjdk/jcstress
