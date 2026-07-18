---
name: nunit-tests
description: "Configures and runs NUnit - JVM-style attribute-driven .NET test framework with `[Test]` / `[TestCase]` / `[TestCaseSource]` / `[Values]` / `[Random]` parametrize attributes; `[SetUp]` / `[TearDown]` / `[OneTimeSetUp]` / `[OneTimeTearDown]` lifecycle; categories for selective runs; constraint-model assertion API (`Assert.That(actual, Is.EqualTo(expected))`); parameterized fixtures via `[TestFixture]` typed args. Use when working with .NET on a NUnit codebase or preferring constraint-model assertions over xUnit's classic style."
---

# nunit-tests

## Overview

Per [docs.nunit.org][nu-docs]:

[nu-docs]: https://docs.nunit.org/

NUnit (port of JUnit to .NET, originally) was the dominant .NET
test framework before xUnit gained traction. Still actively
maintained; widely used in legacy + new projects with team preference.

Distinguishing properties vs xUnit:

- **Annotation-driven** (xUnit-classic style is unusual)
- **Constraint-model assertions** (`Assert.That(value, Is.EqualTo(expected))`)
- **Multiple parametrize attributes** (`[TestCase]`, `[Values]`,
  `[Random]`, `[Range]`)

## When to use

- Existing NUnit project.
- Team preferring constraint-model assertions over `Assert.Equal()`.
- Test patterns benefiting from `[Random]`/`[Range]` (light
  property-based without ScalaCheck-equivalent).

For new code, [`xunit-tests`](../xunit-tests/SKILL.md) is more
mainstream in 2026.

## Step 1 - Install

```bash
dotnet new nunit -n MyTests
# Or:
dotnet add package NUnit
dotnet add package NUnit3TestAdapter
dotnet add package Microsoft.NET.Test.Sdk
```

## Step 2 - First test

```csharp
using NUnit.Framework;

[TestFixture]
public class CalculatorTests
{
    [Test]
    public void Adds_TwoNumbers()
    {
        Assert.That(Calculator.Add(1, 2), Is.EqualTo(3));
    }
}
```

The `[TestFixture]` annotation is **optional** in NUnit 3+; classes
with `[Test]` methods are auto-discovered. Convention varies - some
teams require `[TestFixture]` for explicitness.

Run: `dotnet test`.

## Step 3 - Parametrize

Per [nu-docs][nu-docs]:

```csharp
[Test]
[TestCase(1, 2, 3)]
[TestCase(0, 0, 0)]
[TestCase(-1, 1, 0)]
public void Adds_VariousInputs(int a, int b, int expected)
{
    Assert.That(Calculator.Add(a, b), Is.EqualTo(expected));
}

[Test]
public void Adds_FromValues(
    [Values(1, 2, 3)] int a,
    [Values(0, 1)] int b)
{
    // Combinatorial: 3 × 2 = 6 test runs
    Assert.That(Calculator.Add(a, b), Is.EqualTo(a + b));
}

[Test]
public void Adds_Random(
    [Random(0, 100, 5)] int a,
    [Random(0, 100, 5)] int b)
{
    // 5 random values × 5 = 25 runs with random ints in [0, 100)
    Assert.That(Calculator.Add(a, b), Is.EqualTo(a + b));
}

[Test]
public void Adds_Range([Range(0, 10, 2)] int n)
{
    // n = 0, 2, 4, 6, 8, 10
    Assert.That(Calculator.Add(n, n), Is.EqualTo(n * 2));
}

// Method-source
[Test]
[TestCaseSource(nameof(AddCases))]
public void Adds_FromSource(int a, int b, int expected) { ... }

public static IEnumerable<TestCaseData> AddCases()
{
    yield return new TestCaseData(1, 2, 3);
    yield return new TestCaseData(0, 0, 0);
}
```

## Step 4 - Constraint-model assertions

Per [nu-docs][nu-docs]:

```csharp
Assert.That(value, Is.EqualTo(expected));
Assert.That(value, Is.Not.EqualTo(expected));
Assert.That(value, Is.GreaterThan(0));
Assert.That(string, Does.Contain("substring"));
Assert.That(string, Does.Match("regex"));
Assert.That(list, Has.Count.EqualTo(3));
Assert.That(list, Has.Member("alice"));
Assert.That(list, Is.Ordered);
Assert.That(list, Has.All.GreaterThan(0));
Assert.That(opt, Is.Null);
Assert.That(opt, Is.Not.Null);
Assert.That(value, Is.InstanceOf<MyClass>());
Assert.That(value, Is.TypeOf<MyClass>());   // strict type
Assert.That(action, Throws.TypeOf<ArgumentException>());
Assert.That(actual, Is.EqualTo(0.0).Within(0.001));   // float tolerance
```

The constraint model composes (`Is.Not.Null.And.Not.Empty`) and
produces detailed failure messages.

Classic-model assertions (`Assert.AreEqual`, `Assert.IsTrue`) still
work but are discouraged in NUnit 3+.

## Step 5 - Lifecycle

```csharp
[TestFixture]
public class TestsWithLifecycle
{
    [OneTimeSetUp]
    public void OneTimeSetUp() { /* once before all tests in fixture */ }

    [OneTimeTearDown]
    public void OneTimeTearDown() { /* once after */ }

    [SetUp]
    public void SetUp() { /* before each test */ }

    [TearDown]
    public void TearDown() { /* after each test */ }

    [Test]
    public void Test1() { ... }
}
```

## Step 6 - Categories + selective runs

```csharp
[Test]
[Category("Slow")]
public void SlowTest() { }

[Test]
[Category("Integration")]
public void IntegrationTest() { }

// Filter at runtime:
//   dotnet test --filter Category=Integration
```

## Step 7 - Parameterized fixtures

```csharp
[TestFixture("postgres")]
[TestFixture("mysql")]
public class DatabaseTests
{
    private string _engine;
    public DatabaseTests(string engine) { _engine = engine; }

    [Test]
    public void Connect()
    {
        // runs against postgres AND mysql
    }
}
```

## Step 8 - CI integration

Same pattern as xUnit:

```yaml
- run: dotnet test --logger "trx;LogFileName=test-results.trx" \
    --collect:"XPlat Code Coverage"
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use classic `Assert.AreEqual` style | Discouraged in NUnit 3+ | Use constraint model `Assert.That(...)` (Step 4) |
| `[Test]` without `[TestFixture]` in mixed-style codebase | Discovery inconsistencies | Pick a convention; document |
| Heavy use of `[Random]` | Non-deterministic test runs | Set seed via `[Random(seed: 42, ...)]` for reproducibility |
| Mix NUnit + xUnit | Two runners | Pick one |

## Limitations

- Constraint model has learning curve vs `Assert.Equal()` simplicity.
- `[Random]` tests need seed pinning for CI reproducibility.
- NUnit's parallelism less mature than xUnit (xUnit's parallel-by-default
  is more aggressive).

## References

- [nu-docs][nu-docs] - NUnit documentation
- nunit.org - landing
- [`xunit-tests`](../xunit-tests/SKILL.md),
  [`mstest-tests`](../mstest-tests/SKILL.md),
  [`fluentassertions`](../fluentassertions/SKILL.md) - sister tools
- `test-code-conventions`
