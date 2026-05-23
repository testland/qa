---
component: dotnet-test-author
type: agent
archetype: A2
---

# dotnet-test-author — evals

Companion eval cases for [`dotnet-test-author`](../../dotnet-test-author.md).
Three cases covering happy path + branch + adversarial. Re-run by feeding
the **Input** block as the first user message to the agent and comparing
the emitted test file against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date —
each eval is designed to be re-run against each tier.

## Eval 1 — happy path — xUnit + FluentAssertions → [Fact] + .Should().BeNull()

**Input:**

```
Author a .NET unit test for this target method.

Target class + method: UserService.GetUserById(Guid id) returns User?
Behavior spec: "Given an empty in-memory repository, when GetUserById is called
                with any Guid, then the method returns null."
Test project csproj path: tests/UserApi.Tests/UserApi.Tests.csproj

Test project csproj contents:
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.10.0" />
    <PackageReference Include="xunit" Version="2.6.0" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.3" />
    <PackageReference Include="FluentAssertions" Version="6.12.0" />
  </ItemGroup>
</Project>
```

**Target models:** sonnet (2026-05-23), haiku (2026-05-23), opus (2026-05-23)

**Expected:** Detects xUnit from the `xunit` package reference. Detects FluentAssertions. Emits ONE `[Fact]` test that calls `GetUserById` and asserts on the return value via `result.Should().BeNull()`. Emits the test file at `tests/UserApi.Tests/Tests/UserServiceTests.cs`. Includes the AAA structure (instantiate SUT, call method, assert).

**Pass condition:** Output contains the literal strings `[Fact]`, `GetUserById`, AND `Should().BeNull()`. Output contains exactly ONE `[Fact]` attribute (counts `[Fact]` occurrences = 1). Output does NOT contain `[Test]` (NUnit) or `[TestMethod]` (MSTest). Output does NOT emit `Assert.True(true)`.

## Eval 2 — branch — NUnit, no FluentAssertions → [Test] + Assert.That(result, Is.Null)

**Input:**

```
Author a .NET unit test for this target method.

Target class + method: UserService.GetUserById(Guid id) returns User?
Behavior spec: "Given an empty in-memory repository, when GetUserById is called
                with any Guid, then the method returns null."
Test project csproj path: tests/UserApi.Tests/UserApi.Tests.csproj

Test project csproj contents:
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.10.0" />
    <PackageReference Include="NUnit" Version="4.0.1" />
    <PackageReference Include="NUnit3TestAdapter" Version="4.5.0" />
  </ItemGroup>
</Project>
```

**Target models:** sonnet (2026-05-23), haiku (2026-05-23)

**Expected:** Detects NUnit from the `NUnit` + `NUnit3TestAdapter` references. Does NOT find FluentAssertions. Emits a `[Test]` inside a `[TestFixture]` class. Uses NUnit's constraint-model API: `Assert.That(result, Is.Null)`. Does NOT use FluentAssertions `.Should()` syntax.

**Pass condition:** Output contains the literal strings `[Test]`, `Is.Null`, AND `Assert.That`. Output does NOT contain `[Fact]` (xUnit) or `[TestMethod]` (MSTest). Output does NOT contain `.Should()` (no FluentAssertions). Output contains `[TestFixture]` OR a class declaration scoped to NUnit.

## Eval 3 — adversarial — spec given, no target method signature → refuse to author

**Input:**

```
Author a .NET unit test for the user-lookup behaviour.

Behavior spec: "Test that the user lookup works correctly."

(No target class given. No target method signature given. No csproj path given.)
```

**Target models:** sonnet (2026-05-23)

**Expected:** Refuses to author. Asks the user to provide both the target method signature AND the test project csproj path. Does NOT fabricate a method name from the prose "user lookup" → "GetUser" / "FindUser" / "LookupUser". Does NOT default to xUnit without seeing a csproj.

**Pass condition:** Output does NOT contain a generated test method body (no `[Fact]` / `[Test]` / `[TestMethod]` attributes). Output contains either `refuse` / `cannot author` / `need` / `method signature` / `csproj` (any one — signals the refuse-to-proceed message). Output asks for the target method signature OR the csproj path.

## Reproducibility notes

- Inputs are concrete file contents inlined above; no external fixtures.
- Pass conditions are string-match checks on the emitted test file content.
- The agent's tool surface (`Write`, `Edit`, narrow `Bash(dotnet *)`) writes only to the existing test project's `Tests/` directory; eval re-runs should not modify production source.
- Eval cases were authored 2026-05-23 against the v3.0 framework's D7 sub-checks.
