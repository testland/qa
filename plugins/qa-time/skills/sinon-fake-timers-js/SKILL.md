---
name: sinon-fake-timers-js
description: "Wraps Sinon's @sinonjs/fake-timers library for JS/TS testing: install(), tick() / tickAsync(), setSystemTime(), restore(); covers timers (setTimeout / setInterval / requestAnimationFrame), Date / performance.now() / hrtime, and the toFake option for selective override. Use when testing JS/TS code with deterministic timer + clock behaviour."
---

# sinon-fake-timers-js

## Overview

Sinon's `@sinonjs/fake-timers` is the canonical fake-timer + fake-
clock library for JavaScript / TypeScript. Per
[sinonjs.org/releases/latest/fake-timers](https://sinonjs.org/releases/latest/fake-timers/),
it replaces the global timer functions and the Date constructor
with controllable fakes.

This skill is for tests outside Jest (Jest has its own per
[`jest-fake-timers`](../jest-fake-timers/SKILL.md)).

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

### Selectively fake

```typescript
const clock = FakeTimers.install({
  now: new Date('2026-05-20T14:30:00Z').getTime(),
  toFake: ['setTimeout', 'setInterval', 'Date'],  // not 'performance', 'hrtime'
});
```

Useful when you want real performance.now() for benchmarking but
fake Date.

### setSystemTime

```typescript
clock.setSystemTime(new Date('2027-01-01T00:00:00Z'));
expect(new Date().toISOString()).toBe('2027-01-01T00:00:00.000Z');
```

Jumps the clock without ticking any in-flight timers.

### DST tests

```typescript
// Spring-forward simulation requires careful zone setup
// Note: @sinonjs/fake-timers fakes UTC time; for local-zone DST
// behaviour, combine with process.env.TZ
process.env.TZ = 'America/New_York';
const clock = FakeTimers.install({
  now: new Date('2026-03-08T06:30:00Z').getTime(),  // 02:30 EDT - invalid local
});
// ... test that scheduling at 02:30 local degrades gracefully
```

Per [`dst-transition-reference`](../dst-transition-reference/SKILL.md):
the test verifies behaviour at the transition; the fake clock
makes it reproducible.

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
  [`leap-second-reference`](../leap-second-reference/SKILL.md).
- **Tests must isolate `process.env.TZ` per test.** Setting it
  globally affects all subsequent tests.

## References

- @sinonjs/fake-timers:
  [sinonjs.org/releases/latest/fake-timers](https://sinonjs.org/releases/latest/fake-timers/).
- Companion catalogs:
  [`dst-transition-reference`](../dst-transition-reference/SKILL.md),
  [`iso-8601-vs-rfc-3339-reference`](../iso-8601-vs-rfc-3339-reference/SKILL.md).
- Sibling libraries:
  [`jest-fake-timers`](../jest-fake-timers/SKILL.md)
  (Sinon's pattern used by Jest's built-in).
- Cross-language:
  [`libfaketime-c`](../libfaketime-c/SKILL.md),
  [`freezegun-python`](../freezegun-python/SKILL.md),
  [`timecop-ruby`](../timecop-ruby/SKILL.md),
  [`mockclock-jvm`](../mockclock-jvm/SKILL.md).
- Test matrix:
  [`timezone-test-matrix-builder`](../timezone-test-matrix-builder/SKILL.md).
