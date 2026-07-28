# NUnit assertion + parametrize reference

Full constraint-model assertion catalog and parametrize-attribute variations. Core examples live in SKILL.md Steps 3 and 4. Per [docs.nunit.org](https://docs.nunit.org/).

## Constraint-model assertion catalog

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

The constraint model composes (`Is.Not.Null.And.Not.Empty`) and produces detailed failure messages. Classic-model assertions (`Assert.AreEqual`, `Assert.IsTrue`) still work but are discouraged in NUnit 3+.

## Parametrize attribute variations

```csharp
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
