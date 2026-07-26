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

## How to use

1. Add xUnit to the project: `dotnet new xunit`, or the packages `xunit` + `xunit.runner.visualstudio` + `Microsoft.NET.Test.Sdk`.
2. Write `[Fact]` tests in a plain class; assert with `Assert.Equal(expected, actual)`.
3. Replace duplicated tests with `[Theory]` + `[InlineData]` (or `[ClassData]` / `[MemberData]` for computed cases).
4. Share expensive setup via `IClassFixture` / collection fixtures instead of static state (see [references/fixtures-and-parallelism.md](references/fixtures-and-parallelism.md)).
5. Emit diagnostics through an injected `ITestOutputHelper` (Console output is suppressed).
6. Mark skips with `[Fact(Skip = "...")]`, tag tests with `[Trait(...)]`, and filter via `dotnet test --filter`.
7. Run `dotnet test`, tuning collection parallelism for large suites and emitting `.trx` + coverage in CI.

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

## Fixtures + parallelism

For per-test, class (`IClassFixture`), and collection
(`ICollectionFixture`) shared setup, plus assembly-level parallel
config, see
[references/fixtures-and-parallelism.md](references/fixtures-and-parallelism.md).

## Step 5 - Output (ITestOutputHelper)

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

## Step 6 - Pair with FluentAssertions

```csharp
result.Should().Be(42);
list.Should().HaveCount(3).And.Contain("alice");
result.Should().BeOfType<Success>().Which.Value.Should().Be(42);
```

See `fluentassertions`. **Note:**
FluentAssertions changed license in 2024 (paid commercial; free for
OSS); v6 is the last fully-free version.

## Step 7 - CI integration

```yaml
- run: dotnet test --logger "trx;LogFileName=test-results.trx" \
    --collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=opencover
- uses: codecov/codecov-action@v4
  with: { files: ./coverage/coverage.opencover.xml }
```

## Worked example

A service team writes xUnit coverage for a `UserService` backed by a
database. They scaffold with `dotnet new xunit -n Users.Tests`, then
define a `DatabaseFixture : IDisposable` that opens a connection once
and consume it via `public class UserTests : IClassFixture<DatabaseFixture>`.
Pure logic like `Calculator.Add` is covered with a `[Theory]` over
`[InlineData(1, 2, 3)]` / `[InlineData(-1, 1, 0)]` asserting
`Assert.Equal(expected, Calculator.Add(a, b))`. A staging-only case is
parked with `[Fact(Skip = "Requires staging DB")]`, and the DB-backed
classes join a `[Collection("DbCollection")]` so they run sequentially
against the shared connection while pure-logic tests parallelize.
Diagnostics go through an injected `ITestOutputHelper`. CI runs
`dotnet test --logger "trx;LogFileName=test-results.trx" --collect:"XPlat Code Coverage"`
and uploads coverage. Result: fast parallel unit coverage plus
serialized DB-backed tests sharing one fixture.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Console.WriteLine` instead of `ITestOutputHelper` | Output suppressed | Use `ITestOutputHelper` (Step 5) |
| Use `[Theory]` without data attribute | Test never runs | Always include `[InlineData]` etc. |
| Shared mutable state in `IClassFixture` | Test order dependence | Per-test fresh state OR `[Collection]` synchronization |
| Skip parallel tuning at scale | Slow CI | Per-assembly + per-collection config (see [references/fixtures-and-parallelism.md](references/fixtures-and-parallelism.md)) |

## Limitations

- xUnit's "constructor as setup, IDisposable as teardown" is
  unintuitive vs JUnit's annotations.
- Test discovery is slow on large solutions; use `--filter`.
- v2 vs v3 API has minor breaking changes; pin version per project.

## References

- [xn-docs][xn-docs] - xUnit.net documentation
- xunit.net - landing
- learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test - dotnet test
- [references/fixtures-and-parallelism.md](references/fixtures-and-parallelism.md) - fixtures + parallel execution
- `nunit-tests`,
  `mstest-tests`,
  `fluentassertions` - sister tools
- `test-code-conventions`
