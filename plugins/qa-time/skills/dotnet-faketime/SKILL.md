---
name: dotnet-faketime
description: "Wraps .NET's TimeProvider abstraction (System.TimeProvider, introduced .NET 8) and FakeTimeProvider from Microsoft.Extensions.TimeProvider.Testing: SetUtcNow, Advance, AutoAdvanceAmount, CreateTimer, Delay, and the pre-.NET-8 ISystemClock migration path. Use when testing C# or F# code that reads the current time, uses timers, or awaits Task.Delay."
---

# dotnet-faketime

## Overview

.NET 8 introduced `System.TimeProvider`, an abstract class in
`System.Runtime.dll` that provides a testable abstraction for time. The
production singleton `TimeProvider.System` wraps `DateTimeOffset.UtcNow`, the
local `TimeZoneInfo`, `Stopwatch` for high-frequency timestamps, and
`System.Threading.Timer`.

For tests, `FakeTimeProvider` (namespace `Microsoft.Extensions.Time.Testing`,
assembly `Microsoft.Extensions.TimeProvider.Testing.dll`) subclasses
`TimeProvider` and gives full control over the fake clock.

## When to use

- C# or F# unit tests for code that calls `timeProvider.GetUtcNow()`
  or `timeProvider.GetLocalNow()`.
- Tests involving `ITimer` created via `CreateTimer`, or async code
  using `timeProvider.Delay(...)`.
- Migrating away from `DateTime.UtcNow` / `DateTimeOffset.UtcNow`
  called directly in production code.
- Upgrading from the pre-.NET-8 `ISystemClock` pattern.

## How to use

1. Add the `Microsoft.Extensions.TimeProvider.Testing` package to the
   test project (Step 1).
2. Refactor production code to take `TimeProvider` by constructor
   injection and register `TimeProvider.System` in DI (Step 2).
3. In each test, construct a `FakeTimeProvider` and freeze the instant
   with `SetUtcNow(...)` or the constructor overload (Step 3).
4. Drive the clock forward with `Advance(TimeSpan)`, then assert on the
   behaviour (Step 4).
5. For async code, await `fakeTime.Delay(...)` or `CreateTimer`
   callbacks, advancing the virtual clock to fire them (see advanced
   clock control).
6. Set `SetLocalTimeZone(...)` when a branch reads `GetLocalNow()`
   (see advanced clock control).
7. Register `FakeTimeProvider`, never `TimeProvider.System`, in the
   test DI container.

## Step 1 - Add the NuGet package

`FakeTimeProvider` ships in a separate testing package, not in the
BCL. Install it only in test projects:

```xml
<!-- In your test .csproj -->
<PackageReference Include="Microsoft.Extensions.TimeProvider.Testing"
                  Version="9.*" />
```

The package name is `Microsoft.Extensions.TimeProvider.Testing`; it ships the
`FakeTimeProvider` type. `TimeProvider` itself is built into the .NET 8+
runtime and needs no extra package for production code targeting `net8.0` or
later.

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

`SetUtcNow(DateTimeOffset)` sets the frozen instant. The value must be equal
to or later than the current fake time; the clock cannot go backwards.

## Step 4 - Advance time by a duration

`Advance(TimeSpan)` moves the clock forward from its current position.

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
starting instant directly.

Verify: run `dotnet test` and confirm the boundary assertions pass. If a test
hangs or times out instead, the code under test is calling real `Task.Delay`
or `Thread.Sleep` rather than the injected `TimeProvider` - fix the injection
and re-run before relying on the suite.

## Advanced clock control

For auto-advancing reads (`AutoAdvanceAmount`), virtual-clock timers
and `Task.Delay` (`CreateTimer` / `Delay`), and local time zone
testing (`SetLocalTimeZone` / `GetLocalNow`), see
[references/advanced-clock-control.md](references/advanced-clock-control.md).

## Migrating from ISystemClock

Code on the pre-.NET-8 `ISystemClock` pattern replaces that injection
with `TimeProvider` and its fakes with `FakeTimeProvider`. The
legacy interface, a fake implementation, and the full migration path
are in
[references/isystemclock-migration.md](references/isystemclock-migration.md).

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

## Anti-patterns and limitations

Common misuses (direct `DateTime.UtcNow`, static `DateTime` mocks,
backwards `SetUtcNow`, missing `Task.Yield()`) and the tool's limits
(`Task.Delay(int)`, `Thread.Sleep`, `GetTimestamp()`, third-party
`DateTime.UtcNow`, no leap seconds) are cataloged in
[references/anti-patterns-and-limitations.md](references/anti-patterns-and-limitations.md).

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
  `dst-transition-reference`,
  `leap-second-reference`,
  `iso-8601-vs-rfc-3339-reference`.
- Cross-language:
  `mockclock-jvm`,
  `freezegun-python`,
  `timecop-ruby`,
  `sinon-fake-timers-js`,
  `jest-fake-timers`,
  `libfaketime-c`.
- Test matrix:
  `timezone-test-matrix-builder`.
