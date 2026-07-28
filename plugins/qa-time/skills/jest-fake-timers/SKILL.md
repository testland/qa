---
name: jest-fake-timers
description: "Wraps Jest's built-in modern fake-timers (built on @sinonjs/fake-timers since Jest 27): jest.useFakeTimers(), jest.setSystemTime(), jest.advanceTimersByTime(), jest.runAllTimers(), and jest.useRealTimers() for selective restoration. Use when testing JS/TS code in Jest where setTimeout / setInterval / Date / Date.now need deterministic control."
---

# jest-fake-timers

## Overview

Per [jestjs.io/docs/timer-mocks](https://jestjs.io/docs/timer-mocks),
Jest 27+ uses **modern fake timers** built on `@sinonjs/fake-timers`.
The API differs slightly from raw Sinon - Jest exposes
`jest.advanceTimersByTime` instead of `clock.tick`, and
`jest.setSystemTime` instead of `clock.setSystemTime`.

## When to use

- Jest tests for code using setTimeout / setInterval / Date.
- Promise-based async timing tests.
- Replacing legacy `useFakeTimers('legacy')` with modern.

## Authoring

### Enable

```typescript
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-05-20T14:30:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});
```

For a single test, call the same three lines inside the test body
and `jest.useRealTimers()` at the end.

### Advance time

```typescript
test('debounce fires after 300ms', () => {
  let fired = false;
  setTimeout(() => { fired = true; }, 300);

  jest.advanceTimersByTime(299);
  expect(fired).toBe(false);

  jest.advanceTimersByTime(1);
  expect(fired).toBe(true);
});
```

### Promise-based timers

For async code:

```typescript
test('async debounce', async () => {
  let resolved = false;
  setTimeout(async () => {
    await fetchData();
    resolved = true;
  }, 100);

  await jest.advanceTimersByTimeAsync(100);
  expect(resolved).toBe(true);
});
```

Per Jest docs, `advanceTimersByTimeAsync` lets microtasks run
between timer ticks.

### Run all pending timers

```typescript
test('chain of timeouts completes', () => {
  let count = 0;
  function recur() {
    if (++count < 5) setTimeout(recur, 100);
  }
  recur();

  jest.runAllTimers();
  expect(count).toBe(5);
});
```

### Run only pending (not recursive)

```typescript
jest.runOnlyPendingTimers();
```

Avoids infinite loops for self-scheduling code.

### Selective faking, DST, and fetch

Selective faking (`doNotFake`), DST / timezone tests, and mixing
fake timers with a mocked `fetch` are in
[references/advanced-scenarios.md](references/advanced-scenarios.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `jest.useFakeTimers('legacy')` | Deprecated; doesn't fake Date | Modern by default since Jest 27 |
| Forget `jest.useRealTimers()` | Subsequent tests inherit fake timers | `afterEach(jest.useRealTimers)` |
| `jest.advanceTimersByTime` for async chains | Microtasks don't drain | Use `Async` variant |
| Mix real fetch with fake timers | Fetch resolves at real time; tests race | Mock fetch |
| Hardcoded ms count for "5 minutes" | Brittle; magic numbers | Use named constants |
| Sleep loops in test body | Real time still passes when fake timers are off | Mock everything time-related |
| Skip setSystemTime, then call Date | Date returns real time | Always setSystemTime |
| Tests assume fake-timer state persists across files | Per-test or per-file; doesn't | Re-enable per file |

## Limitations

- **Modern fake timers are the default since Jest 27.** Older
  projects may still use legacy.
- **`doNotFake` is fragile.** Some functions internally use
  `Date.now()` - may behave unexpectedly.
- **DST + TZ interaction is Node-runtime-dependent.** ICU data
  ships with Node.
- **`advanceTimersByTime` doesn't process Promises.** Use the
  Async variant for promise-chain testing.

## References

- Jest timer mocks:
  [jestjs.io/docs/timer-mocks](https://jestjs.io/docs/timer-mocks).
- @sinonjs/fake-timers (underlying):
  [github.com/sinonjs/fake-timers](https://github.com/sinonjs/fake-timers).
- Companion catalog:
  `dst-transition-reference`.
- Sibling library (non-Jest test runners):
  `sinon-fake-timers-js`.
- Cross-language:
  `freezegun-python`,
  `timecop-ruby`,
  `mockclock-jvm`,
  `libfaketime-c`.
- Test matrix:
  `timezone-test-matrix-builder`.
