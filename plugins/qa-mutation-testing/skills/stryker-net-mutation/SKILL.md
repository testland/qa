---
name: stryker-net-mutation
description: "Configures Stryker.NET for mutation testing of .NET Core / .NET Framework projects - installs `dotnet-stryker` global tool, scopes mutation to specific csproj, supports xUnit / NUnit / MSTest, authors `stryker-config.json` with thresholds, runs in CI. Use when a .NET test suite needs mutation-quality verification - closes the .NET ecosystem gap left by Stryker.NET being newer than the JS variant."
---

# stryker-net-mutation

## Overview

Per [stryker-net-intro][sni]:

[sni]: https://stryker-mutator.io/docs/stryker-net/introduction/

> "Stryker.NET offers you mutation testing for your .NET Core and
> .NET Framework projects. It allows you to test your tests by
> temporarily inserting bugs."

Per [stryker-net-intro][sni], Stryker.NET joined the Stryker
family in 2018 as the .NET ecosystem mutation testing answer.

## When to use

- A .NET test suite (xUnit / NUnit / MSTest) needs mutation-quality
  verification.
- A C# library needs higher confidence than coverage alone shows.
- The team wants Stryker-family parity across JS + .NET.

## Step 1 - Install

```bash
dotnet tool install -g dotnet-stryker
```

Per-project (recommended for CI determinism):

```bash
dotnet new tool-manifest
dotnet tool install dotnet-stryker
```

## Step 2 - Run

```bash
# From the test project directory
cd MyApp.Tests
dotnet stryker
```

The first run discovers the test framework, reports baseline
coverage, then mutates and re-tests.

## Step 3 - Configure via `stryker-config.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/stryker-mutator/stryker-net/master/src/Stryker.Core/Stryker.Core/stryker-config-schema.json",
  "stryker-config": {
    "project": "../MyApp/MyApp.csproj",
    "test-projects": ["MyApp.Tests.csproj"],
    "mutation-level": "Standard",
    "thresholds": { "high": 80, "low": 60, "break": 50 },
    "concurrency": 4,
    "reporters": ["progress", "html", "cleartext"]
  }
}
```

`mutation-level` controls how aggressive mutations are:
- `Basic` (fewest mutators)
- `Standard` (default, recommended)
- `Advanced`
- `Complete` (most mutators; slowest)

## Step 4 - Solution mode

For multi-project solutions:

```bash
dotnet stryker --solution path/to/MyApp.sln
```

Stryker.NET discovers all test projects and mutates the production
projects each test references.

## Step 5 - CI integration

```yaml
- uses: actions/setup-dotnet@v4
  with: { dotnet-version: '8.x' }
- run: dotnet tool restore
- run: dotnet stryker --break-at 50
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: stryker-net-report
    path: StrykerOutput/
```

Reports land under `StrykerOutput/<timestamp>/reports/mutation-report.html`.

## Step 6 - Mutators (per Standard level)

Common mutators include:

| Mutator                | Example                                                |
|------------------------|--------------------------------------------------------|
| Arithmetic operator    | `+` → `-`, `*` → `/`                                   |
| Conditional boundary   | `<` → `<=`, `>` → `>=`                                 |
| Conditional negation   | `!x` → `x`                                              |
| Logical operator       | `&&` → `\|\|`                                          |
| Equality               | `==` → `!=`                                             |
| Return value           | `return foo()` → `return null` / `return ""` / `return 0` |
| Statement removal      | `Foo();` → `;`                                          |
| String literal         | `"x"` → `""`                                            |

A surviving mutant means the test suite doesn't distinguish the
original behavior from the mutated one.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Running on the entire solution every PR                               | Long runtime; team disables.                                              | Scope to changed projects via `--project`. |
| `mutation-level: Complete` from day one                                | Slowest mode; many irrelevant mutants.                                   | Start `Standard`; promote to `Complete` for critical libraries. |
| Ignoring "no coverage" mutants in the report                          | Untested code; mutation testing can't measure it.                        | Add tests OR exclude those files via `--mutate`. |
| Skipping `--break-at` in CI                                            | Mutation score regressions slip through.                                  | Set `--break-at` to baseline + small headroom (Step 5). |
| Running against a Debug build                                          | Slower; some mutators behave differently.                                 | Run against Release build for CI gates. |

## Limitations

- **Newer than StrykerJS.** Per [stryker-net-intro][sni], the
  .NET variant filled "what developers perceived as a gap";
  feature parity with JS is improving but not 1:1.
- **Async + concurrency mutation can be tricky.** Some mutants
  produce equivalent code; flag + exclude.
- **CI runtime.** A medium codebase mutation run takes 10-60 min;
  not for every PR.

## References

- [sni][sni] - Stryker.NET overview, NuGet distribution, .NET
  Core + .NET Framework support, history.
- [`stryker-mutation`](../stryker-mutation/SKILL.md) - JS sibling
  with the same Stryker model.
- [`pitest-mutation`](../pitest-mutation/SKILL.md),
  [`mutmut-mutation`](../mutmut-mutation/SKILL.md),
  [`mull-mutation`](../mull-mutation/SKILL.md) - per-language
  alternatives.
