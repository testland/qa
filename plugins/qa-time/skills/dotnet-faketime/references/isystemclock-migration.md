# Pre-.NET-8 pattern: ISystemClock migration

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
