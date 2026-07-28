# sinon fake-timers advanced scenarios

Selective override, absolute clock jumps, and DST/timezone setup
extracted from the core skill. Install / tick / tickAsync /
teardown usage stays in SKILL.md.

## Selectively fake

```typescript
const clock = FakeTimers.install({
  now: new Date('2026-05-20T14:30:00Z').getTime(),
  toFake: ['setTimeout', 'setInterval', 'Date'],  // not 'performance', 'hrtime'
});
```

Useful when you want real performance.now() for benchmarking but
fake Date.

## setSystemTime

```typescript
clock.setSystemTime(new Date('2027-01-01T00:00:00Z'));
expect(new Date().toISOString()).toBe('2027-01-01T00:00:00.000Z');
```

Jumps the clock without ticking any in-flight timers.

## DST tests

`@sinonjs/fake-timers` fakes UTC time; for local-zone DST
behaviour, set `process.env.TZ` first, then install at the UTC
instant of the transition.

```typescript
process.env.TZ = 'America/New_York';
const clock = FakeTimers.install({
  now: new Date('2026-03-08T06:30:00Z').getTime(),  // 02:30 EDT - invalid local
});
// ... test that scheduling at 02:30 local degrades gracefully
```

The test verifies behaviour at the transition (see the
dst-transition-reference skill); the fake clock makes it
reproducible.
