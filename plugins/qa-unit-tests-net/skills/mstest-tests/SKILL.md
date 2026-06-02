---
name: mstest-tests
description: "Configures and runs MSTest (now MSTest.TestFramework v3) - Microsoft's first-party .NET test framework with `[TestClass]` / `[TestMethod]` / `[DataRow]` / `[DynamicData]` attributes; `[ClassInitialize]` / `[ClassCleanup]` / `[TestInitialize]` / `[TestCleanup]` lifecycle; `TestContext` injection; tight Visual Studio + dotnet test integration. Use when working with .NET on a MSTest codebase, or in environments standardized on Microsoft toolchain."
rating: 21
d6: 4
archetype: S1
---

# mstest-tests

## Overview

Per [learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-mstest][ms-doc]:

[ms-doc]: https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-mstest

For new code, [`xunit-tests`](../xunit-tests/SKILL.md) or
[`nunit-tests`](../nunit-tests/SKILL.md) are more mainstream.
MSTest is the right pick for Microsoft-mandated environments + legacy.

## When to use

- Existing MSTest project (Visual Studio default before ~2018).
- Microsoft-toolchain shop standardized on first-party tooling.
- Team preference for tight Visual Studio integration.

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

## Step 5 - Categories + filter

```csharp
[TestMethod]
[TestCategory("Integration")]
public void IntegrationTest() { }

// Filter:  dotnet test --filter "TestCategory=Integration"
```

## Step 6 - TestContext

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

## Step 7 - Skip patterns

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

## Step 8 - Parallelism

`.runsettings`:

```xml
<RunSettings>
  <RunConfiguration>
    <MaxCpuCount>4</MaxCpuCount>
  </RunConfiguration>
  <MSTest>
    <Parallelize>
      <Workers>4</Workers>
      <Scope>MethodLevel</Scope>
    </Parallelize>
  </MSTest>
</RunSettings>
```

`Scope`: `MethodLevel` (parallel within class) or `ClassLevel`
(parallel across classes only).

## Step 9 - CI integration

```yaml
- run: dotnet test --logger "trx;LogFileName=test-results.trx" \
    --collect:"XPlat Code Coverage" \
    --settings test.runsettings
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Argument order: `Assert.AreEqual(actual, expected)` (xUnit-style) | MSTest is `(expected, actual)`; failure messages reversed | Verify order (Step 2) |
| Skip `[TestClass]` annotation | Discovery fails (unlike NUnit which auto-discovers) | Always include `[TestClass]` |
| Use `Console.WriteLine` instead of `TestContext.WriteLine` | Output may not appear in test runner | Use TestContext (Step 6) |
| `Assert.Inconclusive` overuse | Tests neither pass nor fail; signals lost | Use `[Ignore]` for permanent skips (Step 7) |

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
- [`xunit-tests`](../xunit-tests/SKILL.md),
  [`nunit-tests`](../nunit-tests/SKILL.md),
  [`fluentassertions`](../fluentassertions/SKILL.md) - sister tools
- [`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md)
