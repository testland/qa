# jest fake-timers advanced scenarios

Selective faking, DST/timezone tests, and fake-timer + mocked
`fetch` interplay extracted from the core skill. Enable / advance
/ run-all usage stays in SKILL.md. General Jest mocking - the three
mock forms and manual `__mocks__/` - is `jest-tests` (in the
qa-unit-tests-js plugin).

## Selective faking

```typescript
jest.useFakeTimers({
  doNotFake: ['nextTick', 'queueMicrotask'],
  now: new Date('2026-05-20T14:30:00Z').getTime(),
});
```

## DST tests

Set the runtime zone before enabling fake timers, then set system
time to the UTC instant of the transition.

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

## Mix fake-timers with real fetch

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
