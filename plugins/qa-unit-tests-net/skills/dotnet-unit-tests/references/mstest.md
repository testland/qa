# MSTest - Microsoft first-party .NET testing (reference)

Companion reference for `dotnet-unit-tests`. Consult for existing MSTest
projects (the Visual Studio default before ~2018) or Microsoft-toolchain
shops standardized on first-party tooling. For new code, xUnit (SKILL.md)
or NUnit ([nunit.md](nunit.md)) are more mainstream.

Per [learn.microsoft.com/dotnet/core/testing/unit-testing-with-mstest][ms-doc]:

[ms-doc]: https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-mstest

## Install and first test

```bash
dotnet new mstest -n MyTests
# Or: dotnet add package MSTest.TestFramework + MSTest.TestAdapter + Microsoft.NET.Test.Sdk
```

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

`[TestClass]` is required - unlike NUnit, discovery fails without it.
`Assert.AreEqual(expected, actual)` takes expected first. Run:
`dotnet test`.

## Lifecycle

Per [ms-doc][ms-doc]: `[ClassInitialize]` / `[ClassCleanup]` (static, once
per class - ClassInitialize receives a `TestContext`), `[TestInitialize]` /
`[TestCleanup]` (per test), and `[AssemblyInitialize]` /
`[AssemblyCleanup]` at assembly level.

## Parametrize

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

## TestContext

Auto-injected per test instance - per-test metadata (test name,
deployment dir, .runsettings properties) plus `WriteLine` output
(the MSTest analog of xUnit's `ITestOutputHelper`):

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

## Skip patterns

`[Ignore("Requires staging DB; tracked in JIRA-1234")]` for permanent
skips; `Assert.Inconclusive("...")` for runtime conditional skips (marks
neither pass nor fail - don't overuse it, signals get lost).

## Categories, parallelism, CI

```csharp
[TestMethod]
[TestCategory("Integration")]
public void IntegrationTest() { }
// Filter: dotnet test --filter "TestCategory=Integration"
```

`.runsettings` parallelism:

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

`Scope`: `MethodLevel` (parallel within class) or `ClassLevel` (parallel
across classes only).

```yaml
- run: dotnet test --logger "trx;LogFileName=test-results.trx" \
    --collect:"XPlat Code Coverage" \
    --settings test.runsettings
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Assert.AreEqual(actual, expected)` reversed | MSTest is `(expected, actual)`; misleading diffs | Expected first, or FluentAssertions ([fluentassertions.md](fluentassertions.md)) |
| Missing `[TestClass]` | Discovery fails | Always include |
| `Console.WriteLine` for output | May not appear in the runner | `TestContext.WriteLine` |
| `Assert.Inconclusive` overuse | Tests neither pass nor fail | `[Ignore]` for permanent skips |

## Limitations

- More verbose attributes than xUnit / NUnit.
- Historically Visual Studio-centric; CLI integration improved but docs
  are still VS-flavored.
- `[DynamicData]` is less ergonomic than xUnit's `[MemberData]`.

## References

- [ms-doc][ms-doc] - Microsoft MSTest tutorial
- github.com/microsoft/testfx - MSTest source
