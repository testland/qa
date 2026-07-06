---
name: reqnroll-testing
description: "Configures Reqnroll (the canonical .NET BDD framework) - install via `dotnet add package Reqnroll`, author `.feature` files in Gherkin, write step bindings as `[Given/When/Then]`-decorated methods in any C# class, runs via `dotnet test`. Reqnroll is the SpecFlow successor (originated as a community port off the SpecFlow codebase); new .NET BDD work targets Reqnroll. Use for .NET projects starting BDD or migrating from SpecFlow."
---

# reqnroll-testing

## Overview

Per [reqnroll-home][rh]:

[rh]: https://reqnroll.net/

> "**Reqnroll** is described as 'an open-source Cucumber-style BDD
> test automation framework for .NET. It has been created as a
> reboot of the SpecFlow project.'"

Per [reqnroll-home][rh]: "Compatible with SpecFlow, allowing quick
migration of existing projects."

The "reboot" framing is the key: SpecFlow's maintenance slowed in
2023; the community forked into Reqnroll, which has continued
active development.

## When to use

- A new .NET project starts BDD - pick Reqnroll over SpecFlow.
- An existing SpecFlow project plans to migrate (per
  [reqnroll-home][rh]: "compatible with SpecFlow, allowing quick
  migration").
- The team needs full Gherkin support including Rule blocks
  (per [reqnroll-home][rh]: "Full Gherkin support with tagged
  Rule blocks").

For SpecFlow-locked legacy projects mid-migration, see
[`specflow-testing`](../specflow-testing/SKILL.md).

## Step 1 - Install

```bash
# In the test project directory
dotnet add package Reqnroll.xUnit                    # or Reqnroll.NUnit / Reqnroll.MsTest
dotnet add package Reqnroll.Tools.MsBuild.Generation  # generates code from .feature files
```

Per [reqnroll-home][rh]: "Works across common operating systems
and .NET versions (including .NET 8.0)."

## Step 2 - Author a Feature

```gherkin
# Features/Cart.feature
Feature: Apply promo code at checkout

  Background:
    Given a logged-in user with email confirmed
    And the cart contains 1 of "BOOK-001" at $24.99

  Rule: Promo codes apply only when valid

    Scenario: Apply valid promo
      When I enter "WELCOME10" in the promo input
      And I click "Apply"
      Then the subtotal updates to $22.49

    Scenario Outline: Reject invalid codes
      When I enter "<code>" in the promo input
      And I click "Apply"
      Then an error appears: "<error>"

      Examples:
        | code       | error                 |
        | EXPIRED50  | This code has expired |
        | NOTREAL    | Code not found        |
```

`Rule:` blocks (Gherkin 6+) group related scenarios; per
[reqnroll-home][rh] this is supported.

## Step 3 - Step bindings

```csharp
// Steps/CartSteps.cs
using Reqnroll;
using Xunit;

[Binding]
public class CartSteps
{
    private CheckoutPage _page;
    private Cart _cart;

    [Given("a logged-in user with email confirmed")]
    public async Task GivenLoggedInUser()
    {
        var user = await TestUsers.LoggedInWithEmailConfirmed();
        _page = new CheckoutPage(user);
    }

    [Given(@"the cart contains (\d+) of ""([^""]*)"" at \$(\d+\.\d+)")]
    public void GivenCartContains(int qty, string sku, decimal price)
    {
        _cart = new Cart();
        _cart.AddItem(new Item(sku, qty, price));
        _page.SetCart(_cart);
    }

    [When(@"I enter ""([^""]*)"" in the promo input")]
    public async Task WhenIEnter(string code)
    {
        await _page.EnterPromoAsync(code);
    }

    [When(@"I click ""([^""]*)""")]
    public async Task WhenIClick(string label)
    {
        await _page.ClickAsync(label);
    }

    [Then(@"the subtotal updates to \$(\d+\.\d+)")]
    public void ThenSubtotalUpdates(decimal expected)
    {
        Assert.Equal(expected, _page.GetSubtotal(), 2);
    }
}
```

Per [reqnroll-home][rh]: "Supports flexible step definitions using
regex or cucumber expressions." The example uses regex; cucumber
expressions are an alternative:

```csharp
[Given("the cart contains {int} of {string} at ${double}")]
public void GivenCartContains(int qty, string sku, double price) { ... }
```

Cucumber expressions are more readable; regex is more flexible.

## Step 4 - Async support

Per [reqnroll-home][rh]: "Async step definitions and hooks."

```csharp
[Then("the order arrives within (\\d+) minutes")]
public async Task ThenOrderArrives(int minutes)
{
    await EmailInbox.WaitForOrderConfirmation(TimeSpan.FromMinutes(minutes));
}
```

`async Task` step methods work transparently; no special config.

## Step 5 - Hooks

```csharp
using Reqnroll;

[Binding]
public class TestHooks
{
    [BeforeTestRun]
    public static async Task BeforeTestRun()
    {
        // Once per test run
        await TestDatabase.Initialize();
    }

    [BeforeScenario]
    public async Task BeforeScenario()
    {
        // Per-scenario
        await TestDatabase.StartTransaction();
    }

    [AfterScenario]
    public async Task AfterScenario(ScenarioContext context)
    {
        await TestDatabase.Rollback();
        if (context.TestError is not null)
        {
            await ScreenshotCapture.Capture(context.ScenarioInfo.Title);
        }
    }

    [BeforeScenario("@browser")]
    public async Task BeforeBrowserScenario()
    {
        // Tag-scoped hook
        await Browser.LaunchAsync();
    }
}
```

## Step 6 - Tags

```gherkin
@critical @regression
Scenario: Apply valid promo
  ...

@browser @wip
Scenario: New checkout flow
  ...
```

```bash
dotnet test --filter "Category=critical"
dotnet test --filter "Category!=wip"
```

## Step 7 - Run

```bash
# All tests
dotnet test

# Specific feature
dotnet test --filter "FullyQualifiedName~Cart"

# Generate JUnit XML for CI
dotnet test --logger "junit;LogFilePath=reports/test-results.xml"
```

## Step 8 - IDE support

Per [reqnroll-home][rh]: "IDE support for Visual Studio 2022, VS
Code, and Rider."

The Reqnroll plugin enables:

- Step navigation (Gherkin → step binding).
- Scaffolding (auto-generate step from undefined Gherkin line).
- Run/debug per-scenario.

## Step 9 - Migrate from SpecFlow

Per [reqnroll-home][rh]: "Compatible with SpecFlow, allowing quick
migration of existing projects."

Migration path:

1. Replace `SpecFlow.*` NuGet packages with `Reqnroll.*` equivalents.
2. Update `using SpecFlow` → `using Reqnroll` (single find/replace).
3. Update `[Binding]` (compatible) and step decorators (mostly
   compatible).
4. Run tests; fix any compatibility issues.

Most SpecFlow projects migrate in <1 day for typical scope.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Starting new .NET BDD with SpecFlow in 2026+                          | SpecFlow's maintenance has slowed; Reqnroll is the active fork.          | Pick Reqnroll (Step 1). |
| Mixing SpecFlow + Reqnroll in one solution                            | Two BDD runners; double maintenance.                                     | Migrate everything (Step 9). |
| Regex-only steps when cucumber expressions would work                  | Less readable; harder to maintain.                                       | Cucumber expressions for typical cases (Step 3). |
| No `[BeforeScenario]` cleanup                                          | State leaks between scenarios.                                           | Per-scenario hook + transaction rollback (Step 5). |
| Sync step methods that block on async                                  | Deadlocks in xUnit / NUnit / MsTest.                                     | `async Task` step methods (Step 4). |

## Limitations

- **Newer than SpecFlow.** Some third-party SpecFlow plugins
  haven't been ported yet.
- **Per-test-framework variant.** xUnit / NUnit / MsTest each have
  their own Reqnroll package; pin matching versions.
- **Gherkin parser quirks.** Some edge cases differ between
  Reqnroll and Cucumber-JVM; cross-port scenarios need verification.

## References

- [rh][rh] - Reqnroll overview: SpecFlow reboot, Gherkin Rule
  blocks, SpecFlow-compatible migration, async hooks, IDE support
  (VS / VS Code / Rider).
- [`specflow-testing`](../specflow-testing/SKILL.md) - legacy
  SpecFlow support skill.
- [`cucumber-testing`](../cucumber-testing/SKILL.md),
  [`behave-testing`](../behave-testing/SKILL.md) - sibling language
  wrappers.
- [`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md) - addresses step proliferation.
