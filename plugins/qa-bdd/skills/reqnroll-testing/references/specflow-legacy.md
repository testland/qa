# SpecFlow legacy support and migration to Reqnroll

Deep reference for `reqnroll-testing`. Consult when maintaining an existing
SpecFlow project that has not migrated yet, or when executing the migration.

## SpecFlow is end-of-life

SpecFlow was the standard .NET BDD runner for a decade. It is dead:
Tricentis, which owned it, states "SpecFlow has been retired"
([shiftsync.tricentis.com](https://shiftsync.tricentis.com/p/shift-to-shiftsync)),
`specflow.org` redirects there, and it "reached its end-of-life on
December 31, 2024" with the GitHub projects deleted as of 1 January
([reqnroll.net](https://reqnroll.net/news/2025/01/specflow-end-of-life-has-been-announced/)).
The packages still install only because nuget.org will not delete existing
ones - exactly how newcomers land on an unsupported dependency. New .NET BDD
work targets Reqnroll; use this page only for existing SpecFlow projects,
especially mid-migration.

## Maintaining an existing SpecFlow project (legacy)

Package references (legacy):

```xml
<PackageReference Include="SpecFlow" Version="3.9.74" />
<PackageReference Include="SpecFlow.xUnit" Version="3.9.74" />
<PackageReference Include="SpecFlow.Tools.MsBuild.Generation" Version="3.9.74" />
```

Features are the same Gherkin as Reqnroll / Cucumber. Step bindings:

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

Compare to Reqnroll: `using TechTalk.SpecFlow` → `using Reqnroll`;
decorators identical. Running is the same `dotnet test` (the runner is the
.NET test framework - xUnit / NUnit / MsTest).

## Migration path

Per [reqnroll.net](https://reqnroll.net/): "Compatible with SpecFlow,
allowing quick migration of existing projects."

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

Most projects migrate in under a day; the migration is mostly mechanical.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Starting new .NET BDD with SpecFlow | Reqnroll is the actively-maintained successor; SpecFlow is EOL | Use the main `reqnroll-testing` skill |
| Postponing migration indefinitely | SpecFlow falls further behind .NET / IDE support | Migrate now; the cost grows over time |
| Mixing SpecFlow + Reqnroll in one solution | Two runners; conflicts | All-or-nothing migration |

## Limitations of staying on SpecFlow

- **Maintenance status.** EOL - no bug fixes, no new features.
- **.NET version compatibility.** Newer .NET versions land on Reqnroll only.
- **IDE plugin updates.** SpecFlow plugins for VS / Rider are frozen;
  Reqnroll's are maintained.
