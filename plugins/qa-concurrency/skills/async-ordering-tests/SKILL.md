---
name: async-ordering-tests
description: "Test async ordering — event-loop / queue / channel ordering assertions, JS Promise microtask vs macrotask ordering, Python `asyncio.gather` vs `asyncio.wait_for` semantics, Go goroutine + channel happens-before relationships, async/await re-entrancy. Use deterministic schedulers (sinon fake timers, asyncio test mode) to remove run-to-run variance."
type: skill
archetype: S3
rating: 22
d6: 4
keywords:
  - async-ordering
  - promises
  - asyncio
  - happens-before
  - event-loop
---

# async-ordering-tests

Async ordering bugs ("user A's update overwrote user B's" / "callback
fired twice" / "promise resolved before fetch returned") look like
race conditions but operate at the runtime level (event loop /
scheduler). Tests must control the scheduler to be deterministic.

## When to use

- UI updates that depend on multiple in-flight requests resolving
  in the right order.
- Server-side: parallel I/O whose completion order affects the
  final state.
- Callback-heavy code where re-entrancy (sync vs async dispatch)
  matters.

## Step 1 — JS Promise microtask vs macrotask

```ts
// Microtasks (Promise callbacks) drain BEFORE next macrotask (setTimeout)
test('microtasks drain before setTimeout', async () => {
  const order: string[] = [];

  setTimeout(() => order.push('setTimeout'), 0);
  Promise.resolve().then(() => order.push('promise'));

  // Wait for both to fire
  await new Promise(r => setTimeout(r, 0));

  expect(order).toEqual(['promise', 'setTimeout']);
});
```

Critical: promise resolution callbacks run in the microtask queue,
which drains *between* macrotasks. Misunderstanding this causes
"why did this fire twice" bugs.

## Step 2 — Use deterministic timers (Sinon / Vitest fake)

```ts
import { vi } from 'vitest';

test('debounced search fires once after 300ms', () => {
  vi.useFakeTimers();
  const search = vi.fn();
  const debounced = debounce(search, 300);

  debounced('a');
  debounced('ab');
  debounced('abc');

  vi.advanceTimersByTime(299);
  expect(search).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(search).toHaveBeenCalledOnce();
  expect(search).toHaveBeenCalledWith('abc');
});
```

Real timers + sleep = flake. Fake timers = deterministic.

## Step 3 — `Promise.all` vs sequential await

```ts
test('parallel fetch starts both before either completes', async () => {
  const order: string[] = [];

  function trackedFetch(name: string) {
    order.push(`start-${name}`);
    return new Promise<string>((resolve) =>
      setTimeout(() => {
        order.push(`done-${name}`);
        resolve(name);
      }, 50)
    );
  }

  await Promise.all([trackedFetch('A'), trackedFetch('B')]);

  // Both started before either finished
  expect(order.indexOf('done-A')).toBeGreaterThan(order.indexOf('start-B'));
});
```

vs sequential:

```ts
test('sequential await runs A fully before B starts', async () => {
  const order: string[] = [];
  await trackedFetch('A');
  await trackedFetch('B');

  expect(order).toEqual(['start-A', 'done-A', 'start-B', 'done-B']);
});
```

Test the actual model your code uses, especially when "parallelize"
is an intentional optimization.

## Step 4 — Python asyncio ordering

```python
import asyncio

async def test_gather_concurrency_with_first_completed():
    started = []
    finished = []

    async def task(name, delay):
        started.append(name)
        await asyncio.sleep(delay)
        finished.append(name)

    await asyncio.gather(task("A", 0.05), task("B", 0.01))

    # Both started before either finished
    assert started == ["A", "B"]
    # B finishes first (shorter sleep)
    assert finished == ["B", "A"]
```

For race-style: use `asyncio.wait(..., return_when=FIRST_COMPLETED)`
to test "whoever finishes first wins" semantics.

## Step 5 — Async re-entrancy

A callback fires while another callback is still running. Tests:

```ts
test('handler not invoked while previous invocation in progress', async () => {
  const calls: string[] = [];
  let inProgress = false;

  const handler = async (msg: string) => {
    calls.push(`enter-${msg}`);
    if (inProgress) {
      throw new Error('Re-entrant call detected');
    }
    inProgress = true;
    await new Promise(r => setTimeout(r, 10));
    inProgress = false;
    calls.push(`exit-${msg}`);
  };

  const queue = createSerializingQueue(handler);
  queue.enqueue('a');
  queue.enqueue('b');

  await queue.drain();
  expect(calls).toEqual(['enter-a', 'exit-a', 'enter-b', 'exit-b']);
});
```

Test guards: queue serializes enqueued work even if event loop
allows interleaving.

## Step 6 — Go channel happens-before

```go
func TestChannelHappensBefore(t *testing.T) {
    var x int
    done := make(chan struct{})

    go func() {
        x = 42        // (1)
        done <- struct{}{}  // (2)
    }()

    <-done           // (3)
    if x != 42 {     // (4) — guaranteed by happens-before
        t.Fatalf("expected 42, got %d", x)
    }
}
```

Go memory model: (1) happens-before (2); (2) happens-before (3);
(3) happens-before (4). Without channel sync, (4) could see 0 even
though (1) ran in the goroutine.

For tests, run with `-race`:

```bash
go test -race ./...
```

## Step 7 — Backpressure / queue overflow

```python
async def test_queue_drops_when_full():
    queue = asyncio.Queue(maxsize=3)
    dropped = []

    async def producer():
        for i in range(10):
            try:
                queue.put_nowait(i)
            except asyncio.QueueFull:
                dropped.append(i)

    await producer()
    assert len(dropped) == 7
```

Bounded queues + drop-on-full = silent data loss. Test the policy
explicitly.

## Step 8 — Cancellation propagation

```python
async def test_cancellation_propagates_to_children():
    child_started = asyncio.Event()
    child_cancelled = asyncio.Event()

    async def child():
        try:
            child_started.set()
            await asyncio.sleep(60)
        except asyncio.CancelledError:
            child_cancelled.set()
            raise

    async def parent():
        await child()

    parent_task = asyncio.create_task(parent())
    await child_started.wait()

    parent_task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await parent_task

    assert child_cancelled.is_set()
```

Common bug: parent cancelled, child task leaks (continues running).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `await sleep(100)` to "let things settle" | Flake on slow CI | Fake timers / explicit waits (Step 2) |
| Test `Promise.all` order assuming sequential | Non-deterministic interleave | Test model explicitly (Step 3) |
| Skip cancellation tests | Cancelled tasks leak forever | Cancellation propagation test (Step 8) |
| Use real timers + `setTimeout(0)` for "next tick" | Race with microtask drain | `queueMicrotask()` or `Promise.resolve()` |
| Test only "happy path" with single task | Concurrency bugs hide | Multi-task scenarios (Step 4) |

## Limitations

- Microtask vs macrotask semantics differ across runtimes (Node
  `process.nextTick` is a third queue between).
- asyncio's behavior changed across Python versions (3.10's
  task-cancellation handling differs from 3.7).
- Go's `-race` finds data races, not all happens-before violations.
- Some libraries (RxJS) layer their own scheduling over the
  runtime — test their semantics, not just the runtime's.

## References

- ECMAScript spec — runtime job semantics; consult tc39.es/ecma262
- Python asyncio docs — docs.python.org/3/library/asyncio.html
- Go memory model — go.dev/ref/mem
- [`race-condition-test-author`](../race-condition-test-author/SKILL.md),
  [`deadlock-detection-harness`](../deadlock-detection-harness/SKILL.md) —
  sister concurrency skills
