# Advanced clock control

Beyond `SetUtcNow` and `Advance`, `FakeTimeProvider` controls
auto-advancing reads, virtual-clock timers, and the local time zone.

## Auto-advance on every read

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

## Test Task.Delay and timers

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

## Local time zone testing

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
`dst-transition-reference` for
expected offset values around spring/fall transitions.
