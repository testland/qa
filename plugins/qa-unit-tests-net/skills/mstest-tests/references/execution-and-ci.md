# MSTest execution: categories, parallelism, CI

Reference material for `mstest-tests`: how to categorize, parallelize, and run MSTest suites in CI. Core authoring lives in the skill's SKILL.md.

## Categories + filter

```csharp
[TestMethod]
[TestCategory("Integration")]
public void IntegrationTest() { }

// Filter:  dotnet test --filter "TestCategory=Integration"
```

## Parallelism

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

`Scope`: `MethodLevel` (parallel within class) or `ClassLevel` (parallel across classes only).

## CI integration

```yaml
- run: dotnet test --logger "trx;LogFileName=test-results.trx" \
    --collect:"XPlat Code Coverage" \
    --settings test.runsettings
```
