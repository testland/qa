---
name: specflow-testing
description: Legacy support for SpecFlow (.NET BDD framework that predates Reqnroll) — for projects that haven't migrated yet. Mirrors Reqnroll's API closely (Reqnroll is the SpecFlow fork). Body documents the SpecFlow patterns + the migration path to Reqnroll. Per Reqnroll's own positioning, new .NET BDD work targets Reqnroll, not SpecFlow. Use only for existing SpecFlow projects mid-migration; new projects use `reqnroll-testing` instead.
rating: 22
d6: 3
archetype: S1
---

# specflow-testing

## Overview

SpecFlow is the historical .NET BDD framework that originated the
Cucumber-for-.NET ecosystem. Reqnroll forked from it in 2023 due
to slowing SpecFlow maintenance; per
[`reqnroll-home`](https://reqnroll.net/), Reqnroll is "an
open-source Cucumber-style BDD test automation framework for
.NET. It has been created as a reboot of the SpecFlow project."

This skill exists to **support existing SpecFlow projects**.
For new .NET BDD work, use [`reqnroll-testing`](../reqnroll-testing/SKILL.md)
— Reqnroll is API-compatible and actively maintained.

## When to use

- An existing project uses SpecFlow and the team isn't ready to
  migrate.
- Documentation maintenance for a deprecated codebase.

If starting a new .NET BDD project: stop. Use Reqnroll.

## Step 1 — Install (legacy)

```xml
<PackageReference Include="SpecFlow" Version="3.9.74" />
<PackageReference Include="SpecFlow.xUnit" Version="3.9.74" />
<PackageReference Include="SpecFlow.Tools.MsBuild.Generation" Version="3.9.74" />
```

## Step 2 — Author a Feature

Same Gherkin as Reqnroll / Cucumber:

```gherkin
Feature: Apply promo code at checkout

  Scenario: Apply valid promo
    Given a logged-in user
    When I enter "WELCOME10" in the promo input
    Then the subtotal updates to $22.49
```

## Step 3 — Step bindings

```csharp
using TechTalk.SpecFlow;
using Xunit;

[Binding]
public class CartSteps
{
    [Given("a logged-in user")]
    public void GivenLoggedInUser() { /* ... */ }

    [When(@"I enter ""([^""]*)"" in the promo input")]
    public void WhenIEnter(string code) { /* ... */ }

    [Then(@"the subtotal updates to \$(\d+\.\d+)")]
    public void ThenSubtotalUpdates(decimal expected) { /* ... */ }
}
```

Compare to Reqnroll: `using TechTalk.SpecFlow` → `using Reqnroll`.
Decorators identical.

## Step 4 — Migrate to Reqnroll

Per [`reqnroll-home`](https://reqnroll.net/): "Compatible with
SpecFlow, allowing quick migration of existing projects."

```bash
# 1. Remove SpecFlow packages
dotnet remove package SpecFlow
dotnet remove package SpecFlow.xUnit
dotnet remove package SpecFlow.Tools.MsBuild.Generation

# 2. Add Reqnroll equivalents
dotnet add package Reqnroll.xUnit
dotnet add package Reqnroll.Tools.MsBuild.Generation
```

```csharp
// 3. Find/replace in code:
//   using TechTalk.SpecFlow → using Reqnroll
//   TechTalk.SpecFlow → Reqnroll
```

```bash
# 4. Run tests; fix any breakages
dotnet test
```

Most projects migrate in <1 day. The migration is mostly
mechanical.

## Step 5 — Why migrate?

| Reason                                          |
|-------------------------------------------------|
| SpecFlow's maintenance has slowed; new versions sparse. |
| .NET 8+ support is more reliable on Reqnroll.    |
| Reqnroll has community contributions; SpecFlow's stagnated. |
| Per [`reqnroll-home`](https://reqnroll.net/): the project is "open-source" and "community-driven." |
| New IDE plugin support targets Reqnroll first.   |

## Step 6 — Run

```bash
dotnet test
dotnet test --filter "Category=critical"
```

Same as Reqnroll. The runner is the .NET test framework (xUnit /
NUnit / MsTest).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Starting new .NET BDD with SpecFlow                                   | Reqnroll is the actively-maintained successor.                           | Use [`reqnroll-testing`](../reqnroll-testing/SKILL.md). |
| Postponing migration indefinitely                                      | SpecFlow falls further behind .NET / IDE support.                        | Migrate now (Step 4); the cost grows over time. |
| Mixing SpecFlow + Reqnroll in one solution                            | Two runners; conflicts.                                                   | All-or-nothing migration. |

## Limitations

- **Maintenance status.** SpecFlow gets bug fixes occasionally;
  not new features.
- **.NET version compatibility.** Newer .NET versions land on
  Reqnroll first.
- **IDE plugin updates.** SpecFlow plugins for VS / Rider lag
  behind Reqnroll's.

## References

- [`reqnroll-home`](https://reqnroll.net/) — Reqnroll's own
  description of itself as "a reboot of the SpecFlow project."
- [`reqnroll-testing`](../reqnroll-testing/SKILL.md) — the
  recommended skill for new .NET BDD projects.
- [`cucumber-testing`](../cucumber-testing/SKILL.md),
  [`behave-testing`](../behave-testing/SKILL.md) — non-.NET
  alternatives if rewriting.
