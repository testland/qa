# Anti-patterns and limitations

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `DateTime.UtcNow` directly in code | Not injectable; test is forced to use wall-clock | Inject `TimeProvider`; call `_time.GetUtcNow()` |
| `DateTimeOffset.UtcNow` directly in code | Same problem | Inject `TimeProvider` |
| Static mock of `DateTime` via Fakes/Harmony | Requires special test runner config or IL rewriting | Use DI with `TimeProvider` |
| Call `SetUtcNow` with a value earlier than current | Throws `ArgumentOutOfRangeException` | Use `Advance` or construct fresh `FakeTimeProvider` |
| Forget `await Task.Yield()` after `Advance` | Continuations haven't had a chance to run yet | Yield or await the completed task |
| `AutoAdvanceAmount` in tests needing exact instants | Clock shifts unexpectedly between reads | Set `AutoAdvanceAmount = TimeSpan.Zero` (default) |
| Register `TimeProvider.System` in test DI | Tests become time-dependent and flaky | Register `FakeTimeProvider` in test DI setup |

## Limitations

- `Task.Delay(int)` overloads that do NOT accept a `TimeProvider`
  still use wall-clock time. Always use the
  `timeProvider.Delay(TimeSpan)` extension form.
- `Thread.Sleep` is not controlled by `FakeTimeProvider`; restructure
  to use `await timeProvider.Delay(...)` instead.
- High-frequency `GetTimestamp()` values are derived from the fake
  UTC instant, not from `Stopwatch`. Per
  [learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.timestampfrequency](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.timestampfrequency),
  `TimestampFrequency` is a fixed value tied to the fake clock.
- Third-party libraries that call `DateTime.UtcNow` internally are
  not affected by `FakeTimeProvider`; only code that accepts
  `TimeProvider` by injection can be controlled this way.
- No leap-second simulation; see
  `leap-second-reference`.
