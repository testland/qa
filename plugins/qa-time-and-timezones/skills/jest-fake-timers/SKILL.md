---
name: jest-fake-timers
description: "Wraps Jest's built-in modern fake-timers (built on @sinonjs/fake-timers since Jest 27): jest.useFakeTimers(), jest.setSystemTime(), jest.advanceTimersByTime(), jest.runAllTimers(), and jest.useRealTimers() for selective restoration. Use when testing JS/TS code in Jest where setTimeout / setInterval / Date / Date.now need deterministic control. Composes dst-transition-reference."
rating: 22
d6: 4
archetype: S1
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

### Enable (per test file)

```typescript
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-05-20T14:30:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});
```

### Enable (per test)

```typescript
test('debounce', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-05-20T14:30:00Z'));

  // ... test body

  jest.useRealTimers();
});
```

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

### Selective faking

```typescript
jest.useFakeTimers({
  doNotFake: ['nextTick', 'queueMicrotask'],
  now: new Date('2026-05-20T14:30:00Z').getTime(),
});
```

### DST tests

```typescript
beforeAll(() => {
  process.env.TZ = 'America/New_York';
  jest.useFakeTimers();
});

test('spring-forward behaviour', () => {
  jest.setSystemTime(new Date('2026-03-08T06:30:00Z'));  // 02:30 EDT - invalid local
  expect(new Date().toString()).toMatch(/03:30/);  // Browser/Node normalises
});
```

### Mix fake-timers with real fetch

If `fetch` is mocked separately, ensure the mock awaits a faked
timer too:

```typescript
test('debounce + fetch', async () => {
  global.fetch = jest.fn().mockResolvedValue({ json: () => ({ ok: true }) });

  myDebouncedFetch();

  await jest.advanceTimersByTimeAsync(300);
  expect(fetch).toHaveBeenCalled();
});
```

## Running

```bash
npx jest
```

## CI integration

```yaml
jobs:
  jest-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npx jest
```

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
  [sinonjs.org/releases/latest/fake-timers](https://sinonjs.org/releases/latest/fake-timers/).
- Companion catalog:
  [`dst-transition-reference`](../dst-transition-reference/SKILL.md).
- Sibling library (non-Jest test runners):
  [`sinon-fake-timers-js`](../sinon-fake-timers-js/SKILL.md).
- Cross-language:
  [`freezegun-python`](../freezegun-python/SKILL.md),
  [`timecop-ruby`](../timecop-ruby/SKILL.md),
  [`mockclock-jvm`](../mockclock-jvm/SKILL.md),
  [`libfaketime-c`](../libfaketime-c/SKILL.md).
- Test matrix:
  [`timezone-test-matrix-builder`](../timezone-test-matrix-builder/SKILL.md).
