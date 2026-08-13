# JavaScript / TypeScript - Jest fake timers and Sinon @sinonjs/fake-timers

Both share one engine: per
[jestjs.io/docs/timer-mocks](https://jestjs.io/docs/timer-mocks), Jest 27+
uses **modern fake timers** built on
[`@sinonjs/fake-timers`](https://github.com/sinonjs/fake-timers). Use
Jest's wrapper inside Jest; use the Sinon library directly in Mocha,
Vitest, Jasmine, AVA, `node:test`, or the browser. The API differs only in
naming: `jest.advanceTimersByTime` vs `clock.tick`, `jest.setSystemTime`
vs `clock.setSystemTime`.

## Jest - enable, advance, restore

```typescript
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-05-20T14:30:00Z'));
});
afterAll(() => jest.useRealTimers());

test('debounce fires after 300ms', () => {
  let fired = false;
  setTimeout(() => { fired = true; }, 300);

  jest.advanceTimersByTime(299);
  expect(fired).toBe(false);
  jest.advanceTimersByTime(1);
  expect(fired).toBe(true);
});
```

Async chains need the `Async` variant so microtasks drain between ticks:

```typescript
await jest.advanceTimersByTimeAsync(100);
```

`jest.runAllTimers()` drains every pending timer (recursion included);
`jest.runOnlyPendingTimers()` runs the currently-queued set only - use it
for self-rescheduling code to avoid infinite loops.

## Sinon fake-timers - install, tick, restore

```typescript
import FakeTimers from '@sinonjs/fake-timers';   // npm i -D @sinonjs/fake-timers

const clock = FakeTimers.install({ now: new Date('2026-05-20T14:30:00Z').getTime() });

clock.tick(1000);                                // sync advance
await clock.tickAsync(300);                      // advance + drain microtasks
clock.setSystemTime(new Date('2027-01-01T00:00:00Z'));  // jump, no timers fire

clock.uninstall();                               // ALWAYS in afterEach
```

## Selective faking

Keep real `performance.now()` / `nextTick` while faking timers and `Date`:

```typescript
// Jest
jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'],
                     now: new Date('2026-05-20T14:30:00Z').getTime() });
// Sinon
const clock = FakeTimers.install({ toFake: ['setTimeout', 'setInterval', 'Date'] });
```

## DST tests

Both fake UTC time; for local-zone DST behaviour set the runtime zone
first, then position the clock at the transition's UTC instant:

```typescript
process.env.TZ = 'America/New_York';
jest.useFakeTimers();
jest.setSystemTime(new Date('2026-03-08T06:30:00Z'));  // 02:30 local - non-existent
expect(new Date().toString()).toMatch(/03:30/);        // Node normalises
```

Reset `process.env.TZ` per test - it is process-global.

## Fake timers + mocked fetch

A real `fetch` resolves on the real clock and races faked timers - mock it
and await an async advance:

```typescript
test('debounce + fetch', async () => {
  global.fetch = jest.fn().mockResolvedValue({ json: () => ({ ok: true }) });
  myDebouncedFetch();
  await jest.advanceTimersByTimeAsync(300);
  expect(fetch).toHaveBeenCalled();
});
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `jest.useFakeTimers('legacy')` | Deprecated; doesn't fake `Date` | Modern is the default since Jest 27 |
| Forget `useRealTimers` / `clock.uninstall` | Later tests inherit the fake clock | `afterEach` hook |
| Sync `tick` / `advanceTimersByTime` for promise chains | Microtasks don't drain | `tickAsync` / `advanceTimersByTimeAsync` |
| Skip `setSystemTime`, then read `Date` | `Date.now()` returns real time | Always position the clock |
| `tick(86400 * 365 * 1000)` to "advance a year" | Every timer fires one-by-one; crawls | `setSystemTime` jump |
| DST test without `process.env.TZ` | UTC-only; the local-zone branch never runs | Set `TZ` explicitly per test |

## Limitations

- Monotonic sources (`performance.now`, `process.hrtime`) are only faked
  when requested (`toFake` / defaults vary) - check before asserting.
- `doNotFake` is fragile: some helpers internally read `Date.now()`.
- DST + TZ resolution depends on the runtime's ICU data (Node) or the
  browser's tz tables.

## References

- Jest timer mocks: [jestjs.io/docs/timer-mocks](https://jestjs.io/docs/timer-mocks)
- @sinonjs/fake-timers: [github.com/sinonjs/fake-timers](https://github.com/sinonjs/fake-timers)
- General Jest mocking (the three mock forms, `__mocks__/`):
  `js-unit-tests` in the qa-unit-tests-js plugin
