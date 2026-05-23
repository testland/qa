---
component: dotnet-test-framework-selector
type: agent
archetype: A2
---

# dotnet-test-framework-selector — evals

Companion eval cases for [`dotnet-test-framework-selector`](../../dotnet-test-framework-selector.md).
Three cases covering happy path + branch + adversarial. Re-run by feeding
the **Input** block as the first user message to the agent and comparing
the agent's output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date —
the eval cases are designed to be re-run by a reviewer against each tier.

## Eval 1 — happy path — existing xUnit convention detected → match it

**Input:**

```
Recommend a .NET test framework for this project. Test project path:
C:\repos\InvoiceApp\tests\InvoiceApp.Tests\InvoiceApp.Tests.csproj

File contents:
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

**Expected:** Detects the existing xUnit convention from the `xunit` + `xunit.runner.visualstudio` package references. Recommends **xUnit** to match. Detects FluentAssertions in deps and recommends retaining it. Names `xunit-tests` (and `fluentassertions`) as the read-next skills. Includes a "Conditions under which this flips" section.

**Pass condition:** Output contains the literal string `xUnit` (or `xunit-tests`). Output explicitly references the existing convention (matches text like `existing convention`, `already`, `xunit.runner.visualstudio`, or `xunit` package). Output does NOT recommend `NUnit` or `MSTest` as the primary framework. Output mentions `FluentAssertions` (retention).

## Eval 2 — branch — .NET Framework 4.8 legacy target, no existing tests → NUnit or MSTest

**Input:**

```
Recommend a .NET test framework for this project. Production csproj path:
C:\repos\LegacyERP\src\LegacyERP\LegacyERP.csproj

File contents:
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Library</OutputType>
    <TargetFramework>net48</TargetFramework>
  </PropertyGroup>
</Project>

No sibling test project exists yet.
```

**Target models:** sonnet (2026-05-23), haiku (2026-05-23)

**Expected:** Detects no existing convention. Applies the decision tree for `.NET Framework 4.x` targets and recommends either NUnit OR MSTest as the primary (both span Framework 4.x and modern .NET per Microsoft Learn and the testfx README). Rationale cites the legacy target framework. Names the corresponding skill (`nunit-tests` or `mstest-tests`) as read-next.

**Pass condition:** Output contains the literal string `NUnit` OR `MSTest` (one of the two — both are valid). Output references the `net48` / `.NET Framework` / `4.x` signal in its rationale. Output does NOT recommend `xUnit` as the primary framework.

## Eval 3 — adversarial — raw README only, no project file → refuse to recommend

**Input:**

```
Recommend a .NET test framework for this project. Repository contents:
- README.md (one paragraph: "A C# library for invoice generation.")
- LICENSE
- .gitignore

No *.csproj, no *.sln, no test project.
```

**Target models:** sonnet (2026-05-23)

**Expected:** Refuses to recommend a framework. Asks the user to provide a `.csproj` or `.sln` path. Does NOT guess from the README's free-form prose ("C# library" → "probably xUnit"). Does NOT recommend a default framework.

**Pass condition:** Output does NOT contain a "Recommended framework:" line with a concrete framework name. Output contains either `refuse` / `cannot recommend` / `need` / `provide` / `missing` (any one — the agent surfaces the refuse-to-proceed message). Output asks for a `.csproj` or `.sln` path.

## Reproducibility notes

- Inputs are concrete file contents inlined above; no external fixtures.
- Pass conditions are string-match checks; a reviewer can grep the agent's transcript output.
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow `Bash`) is read-only — eval re-runs do not modify the test repository.
- Eval cases were authored 2026-05-23 against the v3.0 framework's D7 sub-checks.
