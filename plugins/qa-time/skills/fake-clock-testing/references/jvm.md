# JVM - java.time.Clock and InstantSource injection

The JVM has no "freeze clock" library because `java.time` (Java 8+) was
designed with **dependency-injected Clock** as the testing pattern. Per
[docs.oracle.com Clock](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Clock.html):
"Most application code should inject a Clock into any method that needs the
current instant and date/time." Production injects
`Clock.systemDefaultZone()`; tests inject `Clock.fixed(...)`. No global
monkey-patching.

## The injection pattern

```java
public class TaskScheduler {
    private final Clock clock;
    public TaskScheduler(Clock clock) { this.clock = clock; }
    public Task scheduleNext(Duration after) {
        return new Task(Instant.now(clock).plus(after));
    }
}
// production wiring
TaskScheduler prod = new TaskScheduler(Clock.systemDefaultZone());
```

## Clock.fixed (frozen)

```java
@Test
void scheduleNext() {
    Clock fixed = Clock.fixed(Instant.parse("2026-05-20T14:30:00Z"),
                              ZoneId.of("America/New_York"));
    Task task = new TaskScheduler(fixed).scheduleNext(Duration.ofMinutes(5));
    assertEquals(Instant.parse("2026-05-20T14:35:00Z"), task.getScheduledAt());
}
```

`Clock.fixed` never advances - successive `Instant.now(fixed)` calls return
the same value.

## Clock.offset (relative) and a mutable test clock

```java
Clock realPlus10 = Clock.offset(Clock.systemDefaultZone(), Duration.ofMinutes(10));
```

For advance-mid-test semantics, a small custom clock:

```java
public class MutableClock extends Clock {
    private Instant instant;
    private final ZoneId zone;
    public MutableClock(Instant instant, ZoneId zone) { this.instant = instant; this.zone = zone; }
    public void setInstant(Instant i) { this.instant = i; }
    public void advance(Duration d) { instant = instant.plus(d); }
    @Override public Clock withZone(ZoneId z) { return new MutableClock(instant, z); }
    @Override public ZoneId getZone() { return zone; }
    @Override public Instant instant() { return instant; }
}
```

## InstantSource (Java 17+)

Per [docs.oracle.com InstantSource](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/InstantSource.html),
a narrower interface than `Clock` (just `instant()`, no zone) - prefer it
when code only needs the instant; a lambda is a complete fake:

```java
InstantSource fake = () -> Instant.parse("2026-05-20T14:30:00Z");
```

## Spring DI integration

```java
@Configuration
public class ClockConfig {
    @Bean public Clock clock() { return Clock.systemDefaultZone(); }
}

@TestConfiguration
public class TestClockConfig {
    @Bean public Clock clock() {
        return Clock.fixed(Instant.parse("2026-05-20T14:30:00Z"), ZoneOffset.UTC);
    }
}
```

## DST tests

```java
Clock fixed = Clock.fixed(Instant.parse("2026-03-08T07:30:00Z"),  // 02:30 local - non-existent
                          ZoneId.of("America/New_York"));
ZonedDateTime zdt = ZonedDateTime.ofInstant(fixed.instant(), fixed.getZone());
// assert per the resolver rules documented in dst-transition-reference
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Instant.now()` / `System.currentTimeMillis()` directly | Not injectable | Inject Clock; `Instant.now(clock)` |
| Static-mocking Clock with PowerMock | Brittle bytecode rewriting | Use DI |
| No zone in `Clock.fixed` | Defaults matter; local-time tests degenerate | Always pass the zone |
| Only frozen clocks, never advancing | Duration arithmetic untested | `MutableClock.advance` |
| Multiple Clocks per service | Coordination bugs | One Clock per service |

## Limitations

- **Requires source control** - libraries calling `Instant.now()`
  internally aren't reachable; libfaketime partially applies but some JVM
  time calls bypass libc ([libfaketime.md](libfaketime.md)).
- **`Thread.sleep` is real time** - use a controllable
  `ScheduledExecutorService` for schedule-driven code.

## References

- java.time.Clock:
  [docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Clock.html](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Clock.html)
- java.time.InstantSource:
  [docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/InstantSource.html](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/InstantSource.html)
- Baeldung Clock guide: [baeldung.com/java-clock](https://www.baeldung.com/java-clock)
