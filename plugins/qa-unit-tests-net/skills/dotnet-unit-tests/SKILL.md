---
name: dotnet-unit-tests
description: ".NET unit testing (C# / F# / VB.NET) with xUnit.net as the primary framework - `[Fact]` single tests, `[Theory]` + `[InlineData]`/`[ClassData]`/`[MemberData]` parametrization, class and collection fixtures (`IClassFixture` / `ICollectionFixture`), parallel-execution config, `ITestOutputHelper` output, skip/traits filtering, and `dotnet test` CI with trx + coverage. Includes framework choice (xUnit for new projects; match an existing NUnit/MSTest convention detected from csproj PackageReferences; legacy .NET Framework 4.x → NUnit or MSTest) and test-authoring conventions (AAA mapping, argument-order traps, no fabricated methods, no smoke asserts). References cover NUnit (`[TestCase]`, constraint-model `Assert.That`), MSTest (`[TestClass]` / `[DataRow]` / TestContext), and the FluentAssertions `.Should()` catalog including the v8 commercial-license change. Use for any .NET unit-test task: choosing or configuring a framework, writing or parameterizing tests, fixtures, or wiring CI."
---

# dotnet-unit-tests

## Overview

Per [xunit.net][xn-docs]:

[xn-docs]: https://xunit.net/

xUnit.net is the current .NET test standard (used by .NET Foundation
projects and Microsoft's own .NET runtime). v3 released 2024; v2 still
widely used in production. This skill covers xUnit as the default, with
NUnit and MSTest as references for existing conventions. Lifecycle scope
(configure / run / parameterize / fixtures / CI); test code hygiene is in
`test-code-conventions` (qa-test-review).

## Choosing a framework

1. **Match the existing convention first.** Grep sibling test projects'
   `.csproj` for `<PackageReference Include="...">`: `xunit` / `xunit.v3` →
   xUnit; `NUnit` / `NUnit3TestAdapter` → NUnit; `MSTest` /
   `MSTest.TestFramework` → MSTest. If exactly one is present, match it -
   switching frameworks mid-solution forces a wholesale assertion rewrite
   for no quality gain.
2. **New project on modern .NET (net6.0+)** → **xUnit**: Microsoft's
   testing docs list it as the community-focused default and
   `dotnet new xunit` is a first-party template
   ([learn.microsoft.com/dotnet/core/testing](https://learn.microsoft.com/dotnet/core/testing/)).
3. **Legacy .NET Framework 4.x target** → **NUnit** or **MSTest** (both
   span Framework 4.x and modern .NET) →
   [references/nunit.md](references/nunit.md) /
   [references/mstest.md](references/mstest.md). MSTest also fits shops
   standardized on tight Visual Studio integration.
4. **`FluentAssertions` already in deps** → retain it regardless of
   framework (it auto-detects xUnit, NUnit, and MSTest) →
   [references/fluentassertions.md](references/fluentassertions.md) -
   including the v8 commercial-license change.

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

Run: `dotnet test`. Verify the run reports `Passed!` with the expected
test count; if it discovers 0 tests, confirm the class is `public`, the
method carries `[Fact]`, and all three packages are installed.

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

// Method-based data source
public static IEnumerable<object[]> AddCases =>
    new List<object[]> {
        new object[] { 1, 2, 3 },
        new object[] { 0, 0, 0 },
    };

[Theory]
[MemberData(nameof(AddCases))]
public void Adds_FromMemberData(int a, int b, int expected) { ... }
```

`[ClassData(typeof(AddTestData))]` covers class-based sources
(`IEnumerable<object[]>` implementations). A `[Theory]` without a data
attribute never runs.

## Step 4 - Skip + traits

```csharp
[Fact(Skip = "Requires staging DB")]
public void SkippedTest() { }

[Fact]
[Trait("Category", "Integration")]
public void IntegrationTest() { }

// Filter:  dotnet test --filter "Category=Integration"
```

## Step 5 - Fixtures and parallelism

xUnit's lifecycle: **constructor as setup, `IDisposable.Dispose` as
teardown** - a new test-class instance per test. Shared setup scales up
through fixtures:

```csharp
// Class fixture: shared across all tests in one class
public class DatabaseFixture : IDisposable {
    public DbConnection Connection { get; }
    public DatabaseFixture() { Connection = OpenConnection(); }
    public void Dispose() { Connection.Close(); }
}

public class UserTests : IClassFixture<DatabaseFixture> {
    private readonly DatabaseFixture _fixture;
    public UserTests(DatabaseFixture fixture) { _fixture = fixture; }
}

// Collection fixture: shared across multiple test classes
[CollectionDefinition("DbCollection")]
public class DbCollection : ICollectionFixture<DatabaseFixture> { }

[Collection("DbCollection")]
public class TestsA { ... }

[Collection("DbCollection")]
public class TestsB { ... }   // shares the same DatabaseFixture
```

By default xUnit runs **collections** in parallel; tests in the same
collection run sequentially. Assembly-level tuning:

```csharp
[assembly: CollectionBehavior(DisableTestParallelization = true)]
// or
[assembly: CollectionBehavior(MaxParallelThreads = 4)]
```

Pattern: DB-backed classes share one fixture via `[Collection]` (runs
sequentially against the shared connection) while pure-logic tests
parallelize freely.

## Step 6 - Output (ITestOutputHelper)

xUnit suppresses `Console.WriteLine` in tests:

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

## Step 7 - CI integration

```yaml
- run: dotnet test --logger "trx;LogFileName=test-results.trx" \
    --collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=opencover
- uses: codecov/codecov-action@v4
  with: { files: ./coverage/coverage.opencover.xml }
```

The same `dotnet test --logger trx --collect` shape works for NUnit and
MSTest projects.

## Authoring conventions

When authoring a new unit test in an existing project:

1. **Detect the framework + FluentAssertions from the `.csproj`** (the
   PackageReference table in Choosing). Multiple framework signals in one
   solution → stop and ask which to use.
2. **Verify the target method signature in the production class** (return
   type, parameters, async) - never fabricate method names the spec did
   not state.
3. **Map the spec to Arrange / Act / Assert** - the AAA convention is
   shared across all three frameworks
   ([learn.microsoft.com/dotnet/core/testing](https://learn.microsoft.com/dotnet/core/testing/)).
   Assert observable post-conditions only (return value, collection count,
   thrown exception type) - not internal flags.
4. **One spec → one new test method** at
   `<TestProject>/Tests/<ClassUnderTest>Tests.cs`; never modify existing
   test files.
5. **No smoke asserts** (`Assert.True(true)`,
   `result.Should().NotBeNull()` when a concrete value is named).
6. **Mind argument order**: xUnit and MSTest take `(expected, actual)`;
   NUnit's constraint model (`Assert.That(actual, Is.EqualTo(expected))`)
   and FluentAssertions (`actual.Should().Be(expected)`) sidestep the trap.
7. **Domain-shaped fixtures**: when Bogus is in deps, use `Faker<T>`
   builders via `synthetic-data-toolkit` (qa-test-data); never install
   packages as a side effect.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Console.WriteLine` instead of `ITestOutputHelper` | Output suppressed | Step 6 |
| `[Theory]` without a data attribute | Test never runs | Always include `[InlineData]` etc. (Step 3) |
| Shared mutable state in `IClassFixture` | Test-order dependence | Per-test fresh state or `[Collection]` synchronization (Step 5) |
| Static fields for cross-test state | xUnit creates a new instance per test; statics leak | Constructor per test; fixtures for shared setup |
| Conflating xUnit constructor-per-test with NUnit `[OneTimeSetUp]` | Constructor runs every test | `IClassFixture<T>` for per-fixture setup |
| Skip parallel tuning at scale | Slow CI | Assembly + collection config (Step 5) |

## Limitations

- xUnit's "constructor as setup, IDisposable as teardown" is unintuitive
  vs annotation-driven frameworks.
- Test discovery is slow on large solutions; use `--filter`.
- v2 vs v3 API has minor breaking changes; pin the version per project.

## References

- [xn-docs][xn-docs] - xUnit.net documentation
- learn.microsoft.com/dotnet/core/testing - .NET testing index +
  unit-testing-with-dotnet-test
- [references/nunit.md](references/nunit.md) - NUnit attributes,
  constraint model, parameterized fixtures
- [references/mstest.md](references/mstest.md) - MSTest attributes,
  TestContext, .runsettings parallelism
- [references/fluentassertions.md](references/fluentassertions.md) -
  FluentAssertions matcher catalog + v8 license change
- `test-code-conventions` (qa-test-review) - test code hygiene
