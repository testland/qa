---
name: sinon-fake-timers-js
description: "Wraps Sinon's standalone @sinonjs/fake-timers library for JS/TS testing: install(), tick() / tickAsync(), setSystemTime(), restore(); covers timers (setTimeout / setInterval / requestAnimationFrame), Date / performance.now() / hrtime, and the toFake option for selective override. Runner-agnostic - drives the clock directly in Mocha, AVA, Jasmine, node:test, or the browser. Use when JS/TS code needs deterministic timer or clock control and the test runner does not already expose this library behind its own built-in fake-timer API."
---

# sinon-fake-timers-js

## Overview

`@sinonjs/fake-timers` drives timers and the clock directly, so it
works outside Jest (Jest wraps it per `jest-fake-timers`). Per
[github.com/sinonjs/fake-timers](https://github.com/sinonjs/fake-timers).

## When to use

- Mocha / Jasmine / Vitest tests needing fake timers + clock.
- Testing code that uses setTimeout / setInterval / Date.now /
  requestAnimationFrame.
- Async-flow tests where promises must resolve at controlled
  ticks.

## Authoring

### Install

```bash
npm install --save-dev @sinonjs/fake-timers
```

### Basic install

```typescript
import FakeTimers from '@sinonjs/fake-timers';

const clock = FakeTimers.install({ now: new Date('2026-05-20T14:30:00Z').getTime() });

// Test code that calls Date.now() / new Date() / setTimeout / etc.
expect(new Date().toISOString()).toBe('2026-05-20T14:30:00.000Z');

clock.uninstall();
```

### Tick forward

```typescript
clock.tick(1000);                  // Advance 1000ms
expect(new Date().toISOString()).toBe('2026-05-20T14:30:01.000Z');
```

### Async tick (for promise-based timers)

```typescript
test('debounce fires after 300ms', async () => {
  let fired = false;
  setTimeout(() => { fired = true; }, 300);

  await clock.tickAsync(299);
  expect(fired).toBe(false);

  await clock.tickAsync(1);
  expect(fired).toBe(true);
});
```

### Selective faking, setSystemTime, and DST

The `toFake` selective-override option, `setSystemTime` jumps, and
DST / timezone setup are in
[references/advanced-scenarios.md](references/advanced-scenarios.md).

### Teardown

```typescript
afterEach(() => clock.uninstall());
```

Critical - leaked clocks contaminate subsequent tests.

## Running

```bash
npx mocha
npx vitest run
```

## CI integration

```yaml
jobs:
  time-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npx vitest run
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Forget `clock.uninstall()` | Leaked fake clock contaminates next tests | `afterEach(clock.uninstall)` |
| Mix real + fake timers in same test | Race conditions | Either fake everything or fake nothing |
| Use `tick()` for promise-resolving timers | Promises don't resolve synchronously | Use `tickAsync` |
| Hardcode Unix timestamps | Brittle to system tz | Use `new Date(iso-string)` |
| Test DST without `process.env.TZ` | UTC-only; DST tests degenerate | Set TZ explicitly |
| Fake `hrtime` / `performance` always | Loses real-perf measurement when needed | Use `toFake` option |
| Long `tick(86400 * 365 * 1000)` to "advance 1 year" | Timers fire one-by-one; slow | Use `setSystemTime` instead |

## Limitations

- **Doesn't fake monotonic time by default.** `performance.now()`
  and `process.hrtime()` aren't faked unless requested.
- **DST handling depends on the JS runtime's tz library.** Node
  uses ICU; browsers vary.
- **No leap-second simulation.** See
  `leap-second-reference`.
- **Tests must isolate `process.env.TZ` per test.** Setting it
  globally affects all subsequent tests.

## References

- @sinonjs/fake-timers:
  [github.com/sinonjs/fake-timers](https://github.com/sinonjs/fake-timers).
- Companion catalogs:
  `dst-transition-reference`,
  `iso-8601-vs-rfc-3339-reference`.
- Sibling libraries:
  `jest-fake-timers`
  (Sinon's pattern used by Jest's built-in).
- Cross-language:
  `libfaketime-c`,
  `freezegun-python`,
  `timecop-ruby`,
  `mockclock-jvm`.
- Test matrix:
  `timezone-test-matrix-builder`.
