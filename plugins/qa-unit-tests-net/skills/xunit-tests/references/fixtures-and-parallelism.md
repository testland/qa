# xUnit collections, fixtures, and parallel execution

Reference material for `xunit-tests`: shared setup via fixtures and how xUnit parallelizes work. Collections are the shared concept - they govern both fixture sharing and parallelization. Core authoring lives in the skill's SKILL.md.

## Fixtures

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

## Parallel execution

By default xUnit runs **collections** in parallel; tests in the same
collection run sequentially.

```csharp
// Disable parallelism for an assembly:
[assembly: CollectionBehavior(DisableTestParallelization = true)]

// Or per-collection:
[assembly: CollectionBehavior(MaxParallelThreads = 4)]
```
