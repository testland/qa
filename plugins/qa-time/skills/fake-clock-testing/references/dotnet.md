# .NET - TimeProvider and FakeTimeProvider

.NET 8 introduced `System.TimeProvider`, the testable time abstraction: the
production singleton `TimeProvider.System` wraps `DateTimeOffset.UtcNow`,
the local `TimeZoneInfo`, `Stopwatch` timestamps, and
`System.Threading.Timer`. Tests use `FakeTimeProvider` (namespace
`Microsoft.Extensions.Time.Testing`) which subclasses `TimeProvider`.

## Install (test projects only)

```xml
<PackageReference Include="Microsoft.Extensions.TimeProvider.Testing" Version="9.*" />
```

`TimeProvider` itself is in the .NET 8+ runtime; no production package.

## Inject TimeProvider

```csharp
public class TokenService
{
    private readonly TimeProvider _time;
    public TokenService(TimeProvider time) => _time = time;
    public bool IsExpired(DateTimeOffset expiresAt) => _time.GetUtcNow() > expiresAt;
}

services.AddSingleton(TimeProvider.System);   // production DI
```

Register `FakeTimeProvider`, never `TimeProvider.System`, in test DI.

## Freeze and advance

```csharp
var fakeTime = new FakeTimeProvider(
    new DateTimeOffset(2026, 5, 20, 12, 0, 0, TimeSpan.Zero));   // frozen start
var svc = new TokenService(fakeTime);
var expiresAt = fakeTime.GetUtcNow().AddHours(1);

fakeTime.Advance(TimeSpan.FromHours(2));      // move forward
Assert.True(svc.IsExpired(expiresAt));
```

`SetUtcNow(DateTimeOffset)` repositions the clock; the value must not be
earlier than the current fake time (throws `ArgumentOutOfRangeException`) -
the clock cannot go backwards.

## Auto-advance on every read

Per [FakeTimeProvider.AutoAdvanceAmount](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.autoadvanceamount):
"the amount of time by which time advances whenever the clock is read."

```csharp
fakeTime.AutoAdvanceAmount = TimeSpan.FromMilliseconds(100);
var t1 = fakeTime.GetUtcNow();
var t2 = fakeTime.GetUtcNow();
Assert.Equal(TimeSpan.FromMilliseconds(100), t2 - t1);
```

Prefer explicit `Advance` for tests needing exact instants.

## Task.Delay and timers on the virtual clock

`Delay(TimeProvider, TimeSpan, CancellationToken)` is an extension in
[`TimeProviderTaskExtensions`](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.timeprovidertaskextensions);
`CreateTimer` callbacks fire only when `Advance` passes the due time:

```csharp
var delayTask = fakeTime.Delay(TimeSpan.FromSeconds(30));
var fired = false;
_ = delayTask.ContinueWith(_ => fired = true);

fakeTime.Advance(TimeSpan.FromSeconds(10));
await Task.Yield();                    // let continuations run
Assert.False(fired);

fakeTime.Advance(TimeSpan.FromSeconds(20));
await delayTask;
Assert.True(fired);
```

If a test hangs, the code under test is calling real `Task.Delay(int)` or
`Thread.Sleep` instead of the injected provider - fix the injection.

## Local time zone testing

```csharp
fakeTime.SetUtcNow(new DateTimeOffset(2026, 3, 8, 7, 0, 0, TimeSpan.Zero));
fakeTime.SetLocalTimeZone(TimeZoneInfo.FindSystemTimeZoneById("America/New_York"));
DateTimeOffset local = fakeTime.GetLocalNow();   // UTC-5 or UTC-4 depending on DST
```

Per [TimeProvider.GetLocalNow](https://learn.microsoft.com/en-us/dotnet/api/system.timeprovider.getlocalnow),
`GetLocalNow()` converts the UTC instant to the provider's `LocalTimeZone` -
no environment variables or system clock changes needed.

## Migrating from ISystemClock (pre-.NET 8)

The Microsoft.Extensions stack previously used
[`ISystemClock`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.internal.isystemclock)
(`Microsoft.Extensions.Internal`, a single `UtcNow` property, marked "not
intended to be used directly from your code"). Migration: replace
`ISystemClock` injection with `TimeProvider` and hand-rolled fakes with
`FakeTimeProvider` - `TimeProvider` also covers timers and high-frequency
timestamps, making it the complete replacement.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `DateTime.UtcNow` / `DateTimeOffset.UtcNow` in code | Not injectable | Inject `TimeProvider`; `_time.GetUtcNow()` |
| Static `DateTime` mocks via Fakes/Harmony | IL rewriting, special runners | DI with `TimeProvider` |
| `SetUtcNow` earlier than current | Throws `ArgumentOutOfRangeException` | `Advance`, or a fresh `FakeTimeProvider` |
| No `await Task.Yield()` after `Advance` | Continuations haven't run yet | Yield or await the completed task |
| `AutoAdvanceAmount` in exact-instant tests | Clock shifts between reads | Keep the default `TimeSpan.Zero` |
| `TimeProvider.System` in test DI | Wall-clock flake | Register `FakeTimeProvider` |

## Limitations

- `Task.Delay(int)` overloads without a `TimeProvider` still use wall-clock
  time; always use the `timeProvider.Delay(TimeSpan)` form.
- `Thread.Sleep` is not controlled; restructure to `await timeProvider.Delay(...)`.
- `GetTimestamp()` values derive from the fake UTC instant, not `Stopwatch`
  (per [TimestampFrequency](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.timestampfrequency)).
- Third-party libraries calling `DateTime.UtcNow` internally are unaffected.

## References

- `System.TimeProvider`:
  [learn.microsoft.com/dotnet/api/system.timeprovider](https://learn.microsoft.com/en-us/dotnet/api/system.timeprovider)
- `FakeTimeProvider`:
  [learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider)
- `TimeProviderTaskExtensions`:
  [learn.microsoft.com/dotnet/api/system.threading.tasks.timeprovidertaskextensions](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.timeprovidertaskextensions)
