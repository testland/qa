---
name: xunit-tests
description: "Configures and runs xUnit.net (xUnit v2 + v3) - current de facto .NET test framework with `[Fact]` for single tests + `[Theory]` + `[InlineData]`/`[ClassData]`/`[MemberData]` for parametrized; collection fixtures (`[Collection]`) + class fixtures (`IClassFixture`) for shared setup; output via `ITestOutputHelper`; parallel test config via assembly attribute. Use when working with .NET (C# / F# / VB.NET) on the modern test stack."
---

# xunit-tests

## Overview

Per [xunit.net][xn-docs]:

[xn-docs]: https://xunit.net/

xUnit.net is the current .NET test standard (used by .NET Foundation
projects + Microsoft's own .NET runtime). v3 released 2024;
v2 still widely used in production.

## Step 1 - Install

```bash
dotnet new xunit -n MyProjectTests
# Or in existing project:
dotnet add package xunit
dotnet add package xunit.runner.visualstudio
dotnet add package Microsoft.NET.Test.Sdk
```

## Step 2 - First test

```csharp
using Xunit;

public class CalculatorTests
{
    [Fact]
    public void Adds_TwoNumbers()
    {
        Assert.Equal(3, Calculator.Add(1, 2));
    }
}
```

Run: `dotnet test`.

## Step 3 - Parametrized tests

Per [xn-docs][xn-docs]:

```csharp
[Theory]
[InlineData(1, 2, 3)]
[InlineData(0, 0, 0)]
[InlineData(-1, 1, 0)]
public void Adds_VariousInputs(int a, int b, int expected)
{
    Assert.Equal(expected, Calculator.Add(a, b));
}

// Class-based data source
public class AddTestData : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { 1, 2, 3 };
        yield return new object[] { 0, 0, 0 };
    }
    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

[Theory]
[ClassData(typeof(AddTestData))]
public void Adds_FromClassData(int a, int b, int expected) { ... }

// Method-based
public static IEnumerable<object[]> AddCases =>
    new List<object[]> {
        new object[] { 1, 2, 3 },
        new object[] { 0, 0, 0 },
    };

[Theory]
[MemberData(nameof(AddCases))]
public void Adds_FromMemberData(int a, int b, int expected) { ... }
```

## Step 4 - Skip + traits

```csharp
[Fact(Skip = "Requires staging DB")]
public void SkippedTest() { }

[Fact]
[Trait("Category", "Integration")]
public void IntegrationTest() { }

// Filter:  dotnet test --filter "Category=Integration"
```

## Step 5 - Fixtures

```csharp
// Per-test (default): xUnit creates a new test class instance per test
public class CalculatorTests {
    private readonly Calculator _calc;
    public CalculatorTests() { _calc = new Calculator(); }
    // ...
}

// Class fixture: shared across all tests in a class
public class DatabaseFixture : IDisposable {
    public DbConnection Connection { get; }
    public DatabaseFixture() { Connection = OpenConnection(); }
    public void Dispose() { Connection.Close(); }
}

public class UserTests : IClassFixture<DatabaseFixture> {
    private readonly DatabaseFixture _fixture;
    public UserTests(DatabaseFixture fixture) { _fixture = fixture; }
    [Fact] public void TestsUser() { /* uses _fixture.Connection */ }
}

// Collection fixture: shared across multiple test classes
[CollectionDefinition("DbCollection")]
public class DbCollection : ICollectionFixture<DatabaseFixture> { }

[Collection("DbCollection")]
public class TestsA { ... }

[Collection("DbCollection")]
public class TestsB { ... }   // shares the same DatabaseFixture
```

## Step 6 - Output (ITestOutputHelper)

xUnit suppresses Console.WriteLine in tests. Use `ITestOutputHelper`:

```csharp
public class TestsWithOutput {
    private readonly ITestOutputHelper _output;
    public TestsWithOutput(ITestOutputHelper output) { _output = output; }

    [Fact]
    public void LogsContext() {
        _output.WriteLine("Test running at {0}", DateTime.UtcNow);
    }
}
```

## Step 7 - Parallel execution

By default xUnit runs **collections** in parallel; tests in the same
collection run sequentially.

```csharp
// Disable parallelism for an assembly:
[assembly: CollectionBehavior(DisableTestParallelization = true)]

// Or per-collection:
[assembly: CollectionBehavior(MaxParallelThreads = 4)]
```

## Step 8 - Pair with FluentAssertions

```csharp
result.Should().Be(42);
list.Should().HaveCount(3).And.Contain("alice");
result.Should().BeOfType<Success>().Which.Value.Should().Be(42);
```

See [`fluentassertions`](../fluentassertions/SKILL.md). **Note:**
FluentAssertions changed license in 2024 (paid commercial; free for
OSS); v6 is the last fully-free version.

## Step 9 - CI integration

```yaml
- run: dotnet test --logger "trx;LogFileName=test-results.trx" \
    --collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=opencover
- uses: codecov/codecov-action@v4
  with: { files: ./coverage/coverage.opencover.xml }
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Console.WriteLine` instead of `ITestOutputHelper` | Output suppressed | Use `ITestOutputHelper` (Step 6) |
| Use `[Theory]` without data attribute | Test never runs | Always include `[InlineData]` etc. |
| Shared mutable state in `IClassFixture` | Test order dependence | Per-test fresh state OR `[Collection]` synchronization |
| Skip parallel tuning at scale | Slow CI | Per-assembly + per-collection config (Step 7) |

## Limitations

- xUnit's "constructor as setup, IDisposable as teardown" is
  unintuitive vs JUnit's annotations.
- Test discovery is slow on large solutions; use `--filter`.
- v2 vs v3 API has minor breaking changes; pin version per project.

## References

- [xn-docs][xn-docs] - xUnit.net documentation
- xunit.net - landing
- learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test - dotnet test
- [`nunit-tests`](../nunit-tests/SKILL.md),
  [`mstest-tests`](../mstest-tests/SKILL.md),
  [`fluentassertions`](../fluentassertions/SKILL.md) - sister tools
- `test-code-conventions`
