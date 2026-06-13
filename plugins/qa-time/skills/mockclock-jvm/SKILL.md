---
name: mockclock-jvm
description: "Wraps Java's java.time.Clock + InstantSource dependency-injection pattern for testing time-sensitive code. Covers Clock.fixed(instant, zone), Clock.offset(baseClock, duration), Clock.systemDefaultZone() for production, the InstantSource interface (Java 17+), and the recommended dependency-injection pattern (constructor-inject Clock instead of calling Instant.now() directly). Use when you need to wire the clock-injection pattern (Clock.fixed, Clock.offset, MutableClock, InstantSource, Spring @Bean) into JVM (Java / Kotlin / Scala) production or test code. For pure DST transition reference (skipped or repeated hours, IANA DB, cron-double-fire bug classes) without a clock-injection need, use dst-transition-reference instead. Composes dst-transition-reference + iso-8601-vs-rfc-3339-reference."
rating: 22
d6: 4
---

# mockclock-jvm

## Overview

The JVM doesn't have a single "freeze clock" library because
`java.time` (since Java 8) was designed with **dependency-injected
Clock** as the intended testing pattern. Per
[docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Clock.html](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Clock.html):
"This abstract class models a clock. Most application code should
inject a Clock into any method that needs the current instant
and date/time."

The pattern: production code injects `Clock.systemDefaultZone()`;
tests inject `Clock.fixed(...)`. No global state monkey-patching.

## When to use

- Java / Kotlin / Scala tests for time-sensitive code.
- Designing testable code from the start (constructor-inject Clock).
- Migrating away from `System.currentTimeMillis()` and `Instant.now()`.

## Authoring

### The injection pattern

```java
// Production code
public class TaskScheduler {
    private final Clock clock;

    public TaskScheduler(Clock clock) {
        this.clock = clock;
    }

    public Task scheduleNext(Duration after) {
        return new Task(Instant.now(clock).plus(after));
    }
}

// Wire-up
TaskScheduler prodScheduler = new TaskScheduler(Clock.systemDefaultZone());
```

The injection lets tests pass any Clock implementation.

### Clock.fixed (frozen)

```java
@Test
void scheduleNext() {
    Clock fixed = Clock.fixed(
        Instant.parse("2026-05-20T14:30:00Z"),
        ZoneId.of("America/New_York")
    );
    TaskScheduler scheduler = new TaskScheduler(fixed);

    Task task = scheduler.scheduleNext(Duration.ofMinutes(5));

    assertEquals(
        Instant.parse("2026-05-20T14:35:00Z"),
        task.getScheduledAt()
    );
}
```

`Clock.fixed` doesn't advance. Successive `Instant.now(fixed)`
returns the same value.

### Clock.offset (relative)

```java
Clock realPlus10 = Clock.offset(Clock.systemDefaultZone(), Duration.ofMinutes(10));
// Code reading this clock sees real-time + 10 minutes
```

Useful when you want real-time progression but with a known
offset.

### A mutable test clock (Java 17+)

```java
// Custom: a Clock that can be advanced manually
public class MutableClock extends Clock {
    private Instant instant;
    private final ZoneId zone;

    public MutableClock(Instant instant, ZoneId zone) {
        this.instant = instant;
        this.zone = zone;
    }

    public void setInstant(Instant i) { this.instant = i; }
    public void advance(Duration d) { instant = instant.plus(d); }

    @Override public Clock withZone(ZoneId z) { return new MutableClock(instant, z); }
    @Override public ZoneId getZone() { return zone; }
    @Override public Instant instant() { return instant; }
}
```

Tests can `setInstant` / `advance` to simulate time progression.

### InstantSource (Java 17+)

Per [docs.oracle.com](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/InstantSource.html),
`InstantSource` is a narrower interface than `Clock` (just
`instant()` - no zone). Useful when code only needs the instant:

```java
public class Logger {
    private final InstantSource source;
    public Logger(InstantSource source) { this.source = source; }
    public void log(String msg) {
        System.out.println(source.instant() + " " + msg);
    }
}

// Test
InstantSource fake = () -> Instant.parse("2026-05-20T14:30:00Z");
new Logger(fake).log("hi");
```

### Spring DI integration

```java
@Configuration
public class ClockConfig {
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}

// Test
@TestConfiguration
public class TestClockConfig {
    @Bean public Clock clock() {
        return Clock.fixed(Instant.parse("2026-05-20T14:30:00Z"), ZoneOffset.UTC);
    }
}
```

### DST tests

```java
@Test
void springForwardLocalTime() {
    Clock fixed = Clock.fixed(
        Instant.parse("2026-03-08T07:30:00Z"),  // 02:30 EDT — invalid local
        ZoneId.of("America/New_York")
    );

    // ZonedDateTime resolution depends on resolver
    ZonedDateTime zdt = ZonedDateTime.ofInstant(fixed.instant(), fixed.getZone());
    // Per dst-transition-reference: assert the behaviour matches docs
}
```

## Running

```bash
mvn test
gradle test
```

## CI integration

```yaml
jobs:
  jvm-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin' }
      - run: mvn test
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Instant.now()` directly in code | Not injectable; not testable | Inject Clock; `Instant.now(clock)` |
| `System.currentTimeMillis()` | Same problem | Inject Clock |
| Static-mock the Clock with PowerMock | Brittle; bytecode-rewrite hacks | Use DI |
| Forget zone in `Clock.fixed` | Default UTC; local-time tests degenerate | Explicit zone |
| Test only frozen, not advancing | Misses duration arithmetic | Custom MutableClock |
| Skip InstantSource for narrow needs | Over-specified Clock dependency | Use InstantSource (Java 17+) |
| Live-clock in unit tests | Flaky around minute / hour boundaries | Always inject test Clock |
| Multiple Clocks per service | Coordination bugs | One Clock per service |

## Limitations

- **Requires source control.** Libraries that call `Instant.now()`
  directly aren't testable via Clock injection.
- **`System.currentTimeMillis()` not covered.** Use Clock everywhere.
- **`Thread.sleep` is real-time.** Mockclock pattern doesn't fake
  sleep; use a `ScheduledExecutorService` with a controllable
  executor for that.
- **No leap-second simulation** per
  [`leap-second-reference`](../leap-second-reference/SKILL.md).

## References

- java.time.Clock:
  [docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Clock.html](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Clock.html).
- java.time.InstantSource:
  [docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/InstantSource.html](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/InstantSource.html).
- Baeldung Clock guide:
  [baeldung.com/java-clock](https://www.baeldung.com/java-clock).
- Companion catalogs:
  [`dst-transition-reference`](../dst-transition-reference/SKILL.md),
  [`leap-second-reference`](../leap-second-reference/SKILL.md),
  [`iso-8601-vs-rfc-3339-reference`](../iso-8601-vs-rfc-3339-reference/SKILL.md).
- Cross-language:
  [`libfaketime-c`](../libfaketime-c/SKILL.md),
  [`sinon-fake-timers-js`](../sinon-fake-timers-js/SKILL.md),
  [`jest-fake-timers`](../jest-fake-timers/SKILL.md),
  [`freezegun-python`](../freezegun-python/SKILL.md),
  [`timecop-ruby`](../timecop-ruby/SKILL.md).
- Test matrix:
  [`timezone-test-matrix-builder`](../timezone-test-matrix-builder/SKILL.md).
