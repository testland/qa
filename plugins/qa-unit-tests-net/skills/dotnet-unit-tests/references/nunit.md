# NUnit - attribute-driven .NET testing (reference)

Companion reference for `dotnet-unit-tests`. Consult for existing NUnit
codebases, teams preferring constraint-model assertions, or legacy .NET
Framework 4.x targets. For brand-new .NET code, xUnit (SKILL.md) is the
more mainstream default.

Per [docs.nunit.org][nu-docs]:

[nu-docs]: https://docs.nunit.org/

NUnit's distinguishing properties vs xUnit: annotation-driven lifecycle,
constraint-model assertions (`Assert.That(actual, Is.EqualTo(expected))`),
and multiple parametrize attributes (`[TestCase]`, `[Values]`, `[Random]`,
`[Range]`).

## Install and first test

```bash
dotnet new nunit -n MyTests
# Or: dotnet add package NUnit + NUnit3TestAdapter + Microsoft.NET.Test.Sdk
```

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

`[TestFixture]` is optional in NUnit 3+ (classes with `[Test]` methods are
auto-discovered) - pick a convention and document it. Run: `dotnet test`.

## Parametrize

```csharp
[Test]
[TestCase(1, 2, 3)]
[TestCase(0, 0, 0)]
[TestCase(-1, 1, 0)]
public void Adds_VariousInputs(int a, int b, int expected)
{
    Assert.That(Calculator.Add(a, b), Is.EqualTo(expected));
}

// Combinatorial: 3 × 2 = 6 runs
[Test]
public void Adds_FromValues([Values(1, 2, 3)] int a, [Values(0, 1)] int b)
{
    Assert.That(Calculator.Add(a, b), Is.EqualTo(a + b));
}

[Test]
public void Adds_Range([Range(0, 10, 2)] int n)   // n = 0, 2, 4, 6, 8, 10
{
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

`[Random(0, 100, 5)]` generates random values - pin a seed
(`[Random(seed: 42, ...)]`) for CI reproducibility.

## Constraint-model assertions

Per [nu-docs][nu-docs] - the constraint model composes
(`Is.Not.Null.And.Not.Empty`) and produces detailed failure messages;
classic `Assert.AreEqual` / `Assert.IsTrue` still work but are discouraged
in NUnit 3+:

```csharp
Assert.That(value, Is.EqualTo(expected));
Assert.That(value, Is.Not.EqualTo(expected));
Assert.That(value, Is.GreaterThan(0));
Assert.That(s, Does.Contain("substring"));
Assert.That(s, Does.Match("regex"));
Assert.That(list, Has.Count.EqualTo(3));
Assert.That(list, Has.Member("alice"));
Assert.That(list, Is.Ordered);
Assert.That(list, Has.All.GreaterThan(0));
Assert.That(opt, Is.Null);
Assert.That(value, Is.InstanceOf<MyClass>());
Assert.That(action, Throws.TypeOf<ArgumentException>());
Assert.That(actual, Is.EqualTo(0.0).Within(0.001));   // float tolerance
```

## Lifecycle

`[OneTimeSetUp]` / `[OneTimeTearDown]` (once per fixture) and `[SetUp]` /
`[TearDown]` (per test).

## Categories and parameterized fixtures

```csharp
[Test]
[Category("Integration")]
public void IntegrationTest() { }
// Filter: dotnet test --filter Category=Integration

[TestFixture("postgres")]
[TestFixture("mysql")]
public class DatabaseTests
{
    private string _engine;
    public DatabaseTests(string engine) { _engine = engine; }

    [Test]
    public void Connect() { /* runs against postgres AND mysql */ }
}
```

## CI

Same shape as xUnit:
`dotnet test --logger "trx;LogFileName=test-results.trx" --collect:"XPlat Code Coverage"`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Classic `Assert.AreEqual` style | Discouraged in NUnit 3+ | Constraint model `Assert.That(...)` |
| Unseeded `[Random]` | Non-deterministic CI runs | `[Random(seed: 42, ...)]` |
| Mix NUnit + xUnit in one solution | Two runners | Pick one |

## Limitations

- Constraint model has a learning curve vs `Assert.Equal()` simplicity.
- Parallelism is less aggressive than xUnit's parallel-by-default.

## References

- [nu-docs][nu-docs] - NUnit documentation
- docs.nunit.org/articles/nunit/writing-tests/assertions/assertion-models/constraint.html -
  constraint model
