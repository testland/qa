---
name: mstest-tests
description: "Configures and runs MSTest (now MSTest.TestFramework v3) - Microsoft's first-party .NET test framework with `[TestClass]` / `[TestMethod]` / `[DataRow]` / `[DynamicData]` attributes; `[ClassInitialize]` / `[ClassCleanup]` / `[TestInitialize]` / `[TestCleanup]` lifecycle; `TestContext` injection; tight Visual Studio + dotnet test integration. Use when working with .NET on a MSTest codebase, or in environments standardized on Microsoft toolchain."
---

# mstest-tests

## Overview

Per [learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-mstest][ms-doc]:

[ms-doc]: https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-mstest

For new code, `xunit-tests` or
`nunit-tests` are more mainstream.
MSTest is the right pick for Microsoft-mandated environments + legacy.

## When to use

- Existing MSTest project (Visual Studio default before ~2018).
- Microsoft-toolchain shop standardized on first-party tooling.
- Team preference for tight Visual Studio integration.

## How to use

1. Add MSTest to the project: `dotnet new mstest`, or the three packages (`MSTest.TestFramework`, `MSTest.TestAdapter`, `Microsoft.NET.Test.Sdk`).
2. Create a `[TestClass]` and write `[TestMethod]` tests, asserting with `Assert.AreEqual(expected, actual)` (expected first).
3. Factor shared setup / teardown into `[ClassInitialize]` / `[TestInitialize]` and their cleanup pairs.
4. Cover input ranges with `[DataRow]` or `[DynamicData]` instead of copy-pasted methods.
5. Inject `TestContext` for per-test metadata + `WriteLine` output; use `[Ignore]` (not `Assert.Inconclusive`) for permanent skips.
6. Tag slow tests with `[TestCategory]` and tune `.runsettings` parallelism (see [references/execution-and-ci.md](references/execution-and-ci.md)).
7. Run `dotnet test`, emitting a `.trx` logger + coverage in CI.

## Step 1 - Install

```bash
dotnet new mstest -n MyTests
# Or in existing project:
dotnet add package MSTest.TestFramework
dotnet add package MSTest.TestAdapter
dotnet add package Microsoft.NET.Test.Sdk
```

## Step 2 - First test

Per [ms-doc][ms-doc]:

```csharp
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public class CalculatorTests
{
    [TestMethod]
    public void Adds_TwoNumbers()
    {
        Assert.AreEqual(3, Calculator.Add(1, 2));
    }
}
```

Note: `Assert.AreEqual(expected, actual)` argument order matches
NUnit, **NOT** xUnit's `(expected, actual)` order.

Run: `dotnet test`.

## Step 3 - Lifecycle

Per [ms-doc][ms-doc]:

```csharp
[TestClass]
public class TestsWithLifecycle
{
    [ClassInitialize]
    public static void ClassInit(TestContext context) { /* once before all */ }

    [ClassCleanup]
    public static void ClassCleanup() { /* once after all */ }

    [TestInitialize]
    public void TestInit() { /* before each test */ }

    [TestCleanup]
    public void TestCleanup() { /* after each test */ }

    [TestMethod]
    public void Test1() { ... }
}
```

For assembly-level: `[AssemblyInitialize]` + `[AssemblyCleanup]`.

## Step 4 - Parametrize

```csharp
[TestMethod]
[DataRow(1, 2, 3)]
[DataRow(0, 0, 0)]
[DataRow(-1, 1, 0)]
public void Adds_VariousInputs(int a, int b, int expected)
{
    Assert.AreEqual(expected, Calculator.Add(a, b));
}

// Dynamic data source
[TestMethod]
[DynamicData(nameof(AddCases), DynamicDataSourceType.Method)]
public void Adds_FromDynamic(int a, int b, int expected) { ... }

public static IEnumerable<object[]> AddCases()
{
    yield return new object[] { 1, 2, 3 };
    yield return new object[] { 0, 0, 0 };
}
```

## Step 5 - TestContext

`TestContext` is auto-injected per test instance:

```csharp
[TestClass]
public class TestsWithContext
{
    public TestContext TestContext { get; set; }   // auto-populated by runner

    [TestMethod]
    public void LogsContext()
    {
        TestContext.WriteLine("Test name: {0}", TestContext.TestName);
    }
}
```

`TestContext` provides per-test metadata (test name, deployment dir,
properties from .runsettings) + a `WriteLine` for output (similar to
xUnit's `ITestOutputHelper`).

## Step 6 - Skip patterns

```csharp
[TestMethod]
[Ignore("Requires staging DB; tracked in JIRA-1234")]
public void Skipped() { }

// Conditional skip via runtime check
[TestMethod]
public void ConditionalTest()
{
    if (!IsRunningOnLinux) Assert.Inconclusive("Linux-only test");
    // ...
}
```

`Assert.Inconclusive` marks the test as neither pass nor fail
(distinct from skip).

## Categories, parallelism, CI

For `[TestCategory]` filtering, `.runsettings` parallel config, and the
CI `dotnet test` invocation, see
[references/execution-and-ci.md](references/execution-and-ci.md).

## Worked example

A team maintaining a Microsoft-toolchain app adds MSTest coverage to
`Calculator.Add`. They scaffold with `dotnet new mstest -n Calc.Tests`,
then write a `[TestClass] CalculatorTests` with three `[DataRow]` cases
(`(1, 2, 3)`, `(0, 0, 0)`, `(-1, 1, 0)`) on one `[TestMethod]` asserting
`Assert.AreEqual(expected, Calculator.Add(a, b))`. A case needing a
staging DB is parked with
`[Ignore("Requires staging DB; tracked in JIRA-1234")]`, and an
end-to-end case is tagged `[TestCategory("Integration")]` so CI can run
it separately with `dotnet test --filter "TestCategory=Integration"`.
The pipeline runs
`dotnet test --logger "trx;LogFileName=test-results.trx" --collect:"XPlat Code Coverage"`,
producing a `.trx` report and coverage XML. Result: parametrized MSTest
coverage with the integration case gated out of the fast local loop.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Argument order: `Assert.AreEqual(actual, expected)` (xUnit-style) | MSTest is `(expected, actual)`; failure messages reversed | Verify order (Step 2) |
| Skip `[TestClass]` annotation | Discovery fails (unlike NUnit which auto-discovers) | Always include `[TestClass]` |
| Use `Console.WriteLine` instead of `TestContext.WriteLine` | Output may not appear in test runner | Use TestContext (Step 5) |
| `Assert.Inconclusive` overuse | Tests neither pass nor fail; signals lost | Use `[Ignore]` for permanent skips (Step 6) |

## Limitations

- Less ergonomic than xUnit / NUnit; verbose attributes.
- Visual Studio-centric historically; .NET CLI integration improved
  but documentation still VS-flavored.
- `Assert.AreEqual` ordering different from xUnit (migration source
  of bugs).
- Dynamic data sources less ergonomic than xUnit's `[MemberData]`.

## References

- [ms-doc][ms-doc] - Microsoft MSTest tutorial
- learn.microsoft.com/en-us/visualstudio/test - Visual Studio test docs
- github.com/microsoft/testfx - MSTest source
- [references/execution-and-ci.md](references/execution-and-ci.md) - categories, parallelism, and CI wiring
- `xunit-tests`,
  `nunit-tests`,
  `fluentassertions` - sister tools
- `test-code-conventions`
