---
name: deadlock-detection-harness
description: "Build deadlock-detection harnesses — extract lock-acquire-order graph via instrumentation, run cycle detection (DFS) to spot inconsistent ordering, use lock-acquire timeouts to surface rather than hang, JVM `jstack` / `gdb thread apply all bt` for postmortem analysis. Pair with ThreadSanitizer's `detect_deadlocks=1` for runtime detection."
type: skill
archetype: S3
rating: 22
d6: 4
keywords:
  - deadlock
  - lock-order
  - thread-sanitizer
  - jstack
  - cycle-detection
---

# deadlock-detection-harness

A deadlock = a cycle in the lock-wait graph: thread A holds X waiting
for Y; thread B holds Y waiting for X. Tests prevent deadlocks via
*static analysis of lock acquisition order* + *runtime detection*
(timeouts, sanitizer, postmortem dumps).

## When to use

- Service has multiple locks/mutexes and complex code paths.
- Production hang reported; need to (a) reproduce and (b) prevent
  recurrence.
- Pre-release: `detect_deadlocks` ThreadSanitizer mode passes on
  the test workload.

## Step 1 — Lock-order convention

Establish a strict ordering for all locks and document it:

```python
# Lock order (acquire low-numbered first; release high-numbered first)
LOCK_ORDER = {
    "user_lock": 1,
    "session_lock": 2,
    "audit_lock": 3,
    "db_lock": 4,
}
```

Any code that violates this order = potential deadlock. The
deadlock harness's job: detect violations.

## Step 2 — Instrument lock acquisitions

For Python (rough sketch using contextvars + decorator):

```python
import contextvars
import threading

acquired = contextvars.ContextVar("acquired", default=())

class OrderedLock:
    def __init__(self, name, order):
        self._lock = threading.Lock()
        self.name = name
        self.order = order

    def __enter__(self):
        held = acquired.get()
        if held and held[-1].order >= self.order:
            raise RuntimeError(
                f"Lock-order violation: holding {[h.name for h in held]} "
                f"(orders {[h.order for h in held]}), want {self.name} (order {self.order})"
            )
        self._lock.acquire()
        acquired.set(held + (self,))
        return self

    def __exit__(self, *exc):
        acquired.set(acquired.get()[:-1])
        self._lock.release()
```

In tests, use `OrderedLock` everywhere. Violations raise
synchronously (test fails) instead of silently risking deadlock.

## Step 3 — Build lock-acquire-order graph from logs

For dynamic analysis (when static order isn't enough), capture
acquire events and build the graph:

```python
from collections import defaultdict

def build_lock_graph(events):
    """events: list of (thread_id, action, lock_name)
    action ∈ {'acquire', 'release'}
    """
    held = defaultdict(set)
    edges = defaultdict(set)  # lock A → lock B = "B was acquired while A held"

    for tid, action, lock in events:
        if action == "acquire":
            for prior in held[tid]:
                edges[prior].add(lock)
            held[tid].add(lock)
        else:
            held[tid].discard(lock)
    return edges
```

## Step 4 — Cycle detection (DFS)

```python
def find_cycles(graph):
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n: WHITE for n in graph}
    cycles = []

    def visit(node, path):
        if color.get(node) == GRAY:
            cycles.append(path[path.index(node):])
            return
        if color.get(node) == BLACK:
            return
        color[node] = GRAY
        for nxt in graph.get(node, ()):
            visit(nxt, path + [nxt])
        color[node] = BLACK

    for n in list(graph):
        visit(n, [n])
    return cycles

def test_no_lock_cycles_in_workload():
    events = run_workload_capture()
    graph = build_lock_graph(events)
    cycles = find_cycles(graph)
    assert cycles == [], f"Lock cycles detected: {cycles}"
```

Any cycle = potential deadlock under the right scheduling.

## Step 5 — Lock-acquire timeout (fail-fast)

```python
def test_lock_acquired_within_timeout():
    lock = threading.Lock()
    holder_done = threading.Event()

    def hold_forever():
        with lock:
            holder_done.wait()  # never completes

    t = threading.Thread(target=hold_forever, daemon=True)
    t.start()
    time.sleep(0.1)

    acquired = lock.acquire(timeout=2.0)
    assert acquired, "Lock not acquired within 2s — possible deadlock"
    holder_done.set()
```

In production code, use timed acquires + escalation (log + alert)
instead of indefinite wait — tests verify the contract.

## Step 6 — TSan deadlock detection (C/C++/Go)

ThreadSanitizer (per the [TSan docs]) supports deadlock detection.
Enable per-process:

```bash
TSAN_OPTIONS=detect_deadlocks=1:second_deadlock_stack=1 ./program
```

Output identifies the inconsistent lock orderings causing potential
deadlocks. Catches bugs that haven't manifested as actual deadlock
yet.

## Step 7 — Postmortem dump analysis

When deadlock happens in production, capture state for offline
analysis:

| Stack | Tool |
|---|---|
| JVM | `jstack <pid>` (heap-style, includes lock-graph annotation `Found one Java-level deadlock`) |
| Native (Linux) | `gdb -p <pid> -batch -ex "thread apply all bt"` |
| Go | `kill -SIGQUIT <pid>` (dumps all goroutine stacks + lock holders) |
| .NET | `dotnet-dump collect -p <pid>` + analyze with `dotnet-dump analyze` |

```bash
# JVM example
jstack 12345 > thread-dump.txt
grep -A 5 "Found one Java-level deadlock" thread-dump.txt
```

## Step 8 — Lock-acquire fingerprint test

For systems where lock order is too complex for Step 1 static
ordering, fingerprint each acquire site and verify it's stable:

```python
import hashlib, traceback

acquire_fingerprints = {}

def fingerprint_acquire(lock_name):
    stack = "".join(traceback.format_stack()[-5:])
    key = hashlib.sha256(stack.encode()).hexdigest()[:8]
    acquire_fingerprints.setdefault(lock_name, set()).add(key)

def test_lock_acquired_from_few_sites():
    # Run workload
    run_workload()

    # Each lock should be acquired from a small fingerprint set
    for lock, fps in acquire_fingerprints.items():
        assert len(fps) <= 5, f"Lock {lock} acquired from {len(fps)} sites — refactor"
```

Fewer acquire sites = easier to reason about lock order.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Indefinite `lock.acquire()` in production | Deadlock = silent hang | Use timed acquire + alert (Step 5) |
| Test deadlock by waiting and observing | Flaky; test suite may run before deadlock surfaces | Static order check (Step 1) + cycle detection (Step 4) |
| Skip TSan deadlock detection in CI | Latent ordering bugs ship | `detect_deadlocks=1` (Step 6) |
| No postmortem capture in prod | Each incident reproduces from scratch | jstack on hang (Step 7) |
| Many acquire sites per lock | Hard to reason about; ordering breaks | Fingerprint (Step 8) |

## Limitations

- Static lock-order works for "manual" locks; not for ad-hoc
  synchronization (channels, semaphores, condition variables).
- Cycle detection misses async deadlocks (callback-based,
  promise-based) — see `async-ordering-tests`.
- TSan adds significant overhead (5-15×); not suitable for prod.
- Postmortem dumps reveal current state only; root cause still
  needs human analysis.

## References

- [TSan docs] — `detect_deadlocks=1` runtime option
- jstack — included with JDK; `man jstack`
- [`race-condition-test-author`](../race-condition-test-author/SKILL.md) —
  data-race detection (different problem class)
- [`async-ordering-tests`](../async-ordering-tests/SKILL.md) —
  async-equivalent of deadlock detection

[TSan docs]: https://clang.llvm.org/docs/ThreadSanitizer.html
