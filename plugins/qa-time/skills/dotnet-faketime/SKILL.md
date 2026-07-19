---
name: dotnet-faketime
description: "Wraps .NET's TimeProvider abstraction (System.TimeProvider, introduced .NET 8) and FakeTimeProvider from Microsoft.Extensions.TimeProvider.Testing: SetUtcNow, Advance, AutoAdvanceAmount, CreateTimer, Delay, and the pre-.NET-8 ISystemClock migration path. Use when testing C# or F# code that reads the current time, uses timers, or awaits Task.Delay."
---

# dotnet-faketime

## Overview

.NET 8 introduced `System.TimeProvider`, an abstract class in
`System.Runtime.dll` that provides a testable abstraction for time.
Per
[learn.microsoft.com/dotnet/api/system.timeprovider](https://learn.microsoft.com/en-us/dotnet/api/system.timeprovider):
"Provides an abstraction for time." The concrete production singleton
`TimeProvider.System` wraps `DateTimeOffset.UtcNow`, the local
`TimeZoneInfo`, `Stopwatch` for high-frequency timestamps, and
`System.Threading.Timer`.

For tests, `FakeTimeProvider` (namespace
`Microsoft.Extensions.Time.Testing`, assembly
`Microsoft.Extensions.TimeProvider.Testing.dll`) subclasses
`TimeProvider` and gives full control over the fake clock. Per
[learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider):
"Represents a synthetic time provider that can be used to enable
deterministic behavior in tests."

## When to use

- C# or F# unit tests for code that calls `timeProvider.GetUtcNow()`
  or `timeProvider.GetLocalNow()`.
- Tests involving `ITimer` created via `CreateTimer`, or async code
  using `timeProvider.Delay(...)`.
- Migrating away from `DateTime.UtcNow` / `DateTimeOffset.UtcNow`
  called directly in production code.
- Upgrading from the pre-.NET-8 `ISystemClock` pattern.

## Step 1 - Add the NuGet package

`FakeTimeProvider` ships in a separate testing package, not in the
BCL. Install it only in test projects:

```xml
<!-- In your test .csproj -->
<PackageReference Include="Microsoft.Extensions.TimeProvider.Testing"
                  Version="9.*" />
```

The package name is `Microsoft.Extensions.TimeProvider.Testing`. Per
[learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider),
the assembly is `Microsoft.Extensions.TimeProvider.Testing.dll`.

`TimeProvider` itself is built into the .NET 8+ runtime and needs no
extra package for production code targeting `net8.0` or later.

## Step 2 - Inject TimeProvider into production code

Replace direct calls to `DateTime.UtcNow` or `DateTimeOffset.UtcNow`
with a constructor-injected `TimeProvider`. Wire
`TimeProvider.System` in the DI container; pass `FakeTimeProvider`
in tests.

```csharp
// Production code
public class TokenService
{
    private readonly TimeProvider _time;

    public TokenService(TimeProvider time)
    {
        _time = time;
    }

    public bool IsExpired(DateTimeOffset expiresAt)
        => _time.GetUtcNow() > expiresAt;
}

// DI registration (Startup / Program.cs)
services.AddSingleton(TimeProvider.System);
```

Per
[learn.microsoft.com/dotnet/api/system.timeprovider](https://learn.microsoft.com/en-us/dotnet/api/system.timeprovider),
`TimeProvider.System` is the static singleton that wraps real-world
`DateTimeOffset.UtcNow`.

## Step 3 - Write a deterministic test with SetUtcNow

```csharp
using Microsoft.Extensions.Time.Testing;

[Fact]
public void IsExpired_ReturnsFalse_WhenTokenNotYetExpired()
{
    var fakeTime = new FakeTimeProvider();
    fakeTime.SetUtcNow(new DateTimeOffset(2026, 5, 20, 12, 0, 0, TimeSpan.Zero));

    var svc = new TokenService(fakeTime);

    Assert.False(svc.IsExpired(new DateTimeOffset(2026, 5, 20, 13, 0, 0, TimeSpan.Zero)));
}
```

`SetUtcNow(DateTimeOffset)` sets the frozen instant. Per
[learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.setutcnow](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.setutcnow):
"Advances the date and time in the UTC time zone." The method name
reflects that the value must be equal to or later than the current
fake time; it cannot go backwards.

## Step 4 - Advance time by a duration

`Advance(TimeSpan)` moves the clock forward from its current position.
Per
[learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.advance](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.advance):
"Advances time by a specific amount."

```csharp
[Fact]
public void IsExpired_ReturnsTrue_AfterTokenLifetime()
{
    var fakeTime = new FakeTimeProvider(
        new DateTimeOffset(2026, 5, 20, 12, 0, 0, TimeSpan.Zero));
    var svc = new TokenService(fakeTime);

    // Token valid for 1 hour
    var expiresAt = fakeTime.GetUtcNow().AddHours(1);

    fakeTime.Advance(TimeSpan.FromHours(2));  // jump past expiry

    Assert.True(svc.IsExpired(expiresAt));
}
```

The `FakeTimeProvider(DateTimeOffset)` constructor overload sets the
starting instant directly. Per
[learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.-ctor](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.-ctor):
"Initializes a new instance of the FakeTimeProvider class."

## Step 5 - Auto-advance on every read

`AutoAdvanceAmount` makes the clock tick forward by a fixed amount
each time `GetUtcNow()` is called. Per
[learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.autoadvanceamount](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.autoadvanceamount):
"Gets or sets the amount of time by which time advances whenever the
clock is read."

```csharp
var fakeTime = new FakeTimeProvider();
fakeTime.AutoAdvanceAmount = TimeSpan.FromMilliseconds(100);

// Each GetUtcNow() call adds 100 ms
var t1 = fakeTime.GetUtcNow();
var t2 = fakeTime.GetUtcNow();
Assert.Equal(TimeSpan.FromMilliseconds(100), t2 - t1);
```

Use `AutoAdvanceAmount` for elapsed-time assertions, not for
tests that need precise control - explicit `Advance` calls are more
readable there.

## Step 6 - Test Task.Delay and timers

`FakeTimeProvider` controls the virtual clock used by `Delay` and
`CreateTimer` so that async waiting does not block wall-clock time in
tests.

```csharp
[Fact]
public async Task Poller_DoesNotFireBeforeInterval()
{
    var fakeTime = new FakeTimeProvider();
    var fired = false;

    // timeProvider.Delay(...) is an extension method from
    // System.Threading.Tasks.TimeProviderTaskExtensions
    var delayTask = fakeTime.Delay(TimeSpan.FromSeconds(30));

    _ = delayTask.ContinueWith(_ => fired = true);

    fakeTime.Advance(TimeSpan.FromSeconds(10));
    await Task.Yield();  // let continuations run
    Assert.False(fired);

    fakeTime.Advance(TimeSpan.FromSeconds(20));
    await delayTask;
    Assert.True(fired);
}
```

`Delay(TimeProvider, TimeSpan, CancellationToken)` is an extension
method in `System.Threading.Tasks.TimeProviderTaskExtensions`. Per
[learn.microsoft.com/dotnet/api/system.threading.tasks.timeprovidertaskextensions.delay](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.timeprovidertaskextensions.delay):
"Creates a task that completes after a specified time interval."

`CreateTimer` works analogously: the callback fires only when
`Advance` moves the virtual clock past the due time. Per
[learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.createtimer](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider.createtimer):
"Creates a new ITimer instance, using TimeSpan values to measure
time intervals."

## Step 7 - Local time zone testing

Set a custom `LocalTimeZone` on `FakeTimeProvider` to test
timezone-sensitive branches without touching the system clock or
environment variables:

```csharp
var fakeTime = new FakeTimeProvider();
fakeTime.SetUtcNow(new DateTimeOffset(2026, 3, 8, 7, 0, 0, TimeSpan.Zero));
fakeTime.SetLocalTimeZone(TimeZoneInfo.FindSystemTimeZoneById("America/New_York"));

DateTimeOffset local = fakeTime.GetLocalNow();
// local is UTC-5 or UTC-4 depending on DST; see dst-transition-reference
```

Per
[learn.microsoft.com/dotnet/api/system.timeprovider.getlocalnow](https://learn.microsoft.com/en-us/dotnet/api/system.timeprovider.getlocalnow):
`GetLocalNow()` returns the UTC instant converted to the provider's
`LocalTimeZone`. Use the companion
[`dst-transition-reference`](../dst-transition-reference/SKILL.md) for
expected offset values around spring/fall transitions.

## Pre-.NET-8 pattern: ISystemClock

Before `TimeProvider`, the Microsoft.Extensions stack used
`ISystemClock` (namespace `Microsoft.Extensions.Internal`, assembly
`Microsoft.Extensions.Caching.Abstractions.dll`). Per
[learn.microsoft.com/dotnet/api/microsoft.extensions.internal.isystemclock](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.internal.isystemclock):
"Abstracts the system clock to facilitate testing." It exposed a
single property, `UtcNow`, and carried the notice "This API supports
the .NET infrastructure and is not intended to be used directly from
your code."

```csharp
// Legacy pattern (pre-.NET 8)
public interface ISystemClock
{
    DateTimeOffset UtcNow { get; }
}

// Test implementation
public class FakeSystemClock : ISystemClock
{
    public DateTimeOffset UtcNow { get; set; }
}
```

Migration path: replace `ISystemClock` injection with `TimeProvider`,
and replace fake implementations with `FakeTimeProvider`. The
`ISystemClock` approach covers only `UtcNow`; `TimeProvider` also
covers high-frequency timestamps and timers, making it the complete
replacement.

## CI integration

No special runner configuration is needed. Tests complete instantly
because no wall-clock sleeping occurs.

```yaml
jobs:
  dotnet-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.x'
      - run: dotnet test --configuration Release
```

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
  [`leap-second-reference`](../leap-second-reference/SKILL.md).

## References

- `System.TimeProvider` class:
  [learn.microsoft.com/dotnet/api/system.timeprovider](https://learn.microsoft.com/en-us/dotnet/api/system.timeprovider).
- `FakeTimeProvider` class:
  [learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider).
- `ISystemClock` (pre-.NET 8 pattern):
  [learn.microsoft.com/dotnet/api/microsoft.extensions.internal.isystemclock](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.internal.isystemclock).
- `TimeProviderTaskExtensions` (`Delay`, `WaitAsync`):
  [learn.microsoft.com/dotnet/api/system.threading.tasks.timeprovidertaskextensions](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.timeprovidertaskextensions).
- Companion catalogs:
  [`dst-transition-reference`](../dst-transition-reference/SKILL.md),
  [`leap-second-reference`](../leap-second-reference/SKILL.md),
  [`iso-8601-vs-rfc-3339-reference`](../iso-8601-vs-rfc-3339-reference/SKILL.md).
- Cross-language:
  [`mockclock-jvm`](../mockclock-jvm/SKILL.md),
  [`freezegun-python`](../freezegun-python/SKILL.md),
  [`timecop-ruby`](../timecop-ruby/SKILL.md),
  [`sinon-fake-timers-js`](../sinon-fake-timers-js/SKILL.md),
  [`jest-fake-timers`](../jest-fake-timers/SKILL.md),
  [`libfaketime-c`](../libfaketime-c/SKILL.md).
- Test matrix:
  [`timezone-test-matrix-builder`](../timezone-test-matrix-builder/SKILL.md).
