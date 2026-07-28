---
name: object-model-patterns
description: "Pure reference catalog of the canonical object-model architecture patterns for test automation frameworks - Page Object Model (Fowler), Screenplay (Marcano/Palmer/Hill), Component Object, App Actions (Cypress idiom), Service Object, Repository, and Screen Object (the desktop/mobile sibling of Page Object covering Windows UIA, macOS XCTest, Linux AT-SPI, Appium / Espresso) - each with its canonical citation, when-to-use rules, refuse-to-mix anti-patterns, and a worked example. This is the architecture-tier reference - what each pattern *is* - not file-level style rules and not tool-specific configuration. Use when designing, reviewing, or migrating a test framework's object-model architecture."
---

# object-model-patterns

## Overview

This skill is a **pure reference** - no execution steps; it is the canonical catalog cited to determine "what good looks like" per pattern. The catalog complements `test-code-conventions` (which is file-level §1-§10) with the architecture-tier vocabulary.

## When to use

- Designing a new test automation framework - pick one canonical pattern; do not mix.
- Reviewing an existing framework's architecture - audit which pattern is in use and whether it is applied consistently.
- Migrating from one pattern to another (the most common migration: classic POM → Screenplay or POM → App Actions).
- Onboarding new engineers - point them at the canonical citation for the pattern the team uses.

Do **not** use this skill to:

- Author per-framework tool configuration - that's the per-framework skill (`playwright-testing`, `cypress-testing`, etc.).
- Pick the framework itself - that's `framework-choice-advisor`.
- Audit a running codebase against the chosen pattern - that's a separate framework-architecture audit (this catalog is the reference it cites).

Each pattern below states what it **is**: its definition, canonical citation, and
load-bearing rules. Use the [pattern selection matrix](#pattern-selection-matrix)
to choose one; the detailed per-pattern when-to-use rules and anti-pattern tables
live in [references/pattern-catalog.md](references/pattern-catalog.md).

## Pattern 1 - Page Object Model (POM)

**Canonical source:** [Martin Fowler's PageObject definition](https://martinfowler.com/bliki/PageObject.html) (the bliki article is the cross-language canonical reference) + [Selenium HQ documentation on Page Object Models](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/).

**Fowler's definition:** "A page object wraps an HTML page, or fragment, with an application-specific API, allowing you to manipulate page elements without digging around in the HTML."

**Selenium HQ's elaboration:** "A page object is an object-oriented class that serves as an interface to a page of your AUT… There is a clean separation between the test code and page-specific code, such as locators."

**The three load-bearing rules:**

1. **No assertions in the POM body.** Fowler: "Page objects are most commonly used in testing, but should not make assertions themselves." Selenium HQ: "Page objects themselves should never make verifications or assertions. This is part of your test and should always be within the test's code, never in a page object." One narrow exception (Selenium HQ): a verification at instantiation that the page loaded.
2. **Navigation methods return the next POM.** Fowler: "If you navigate to another page, the initial page object should return another page object for the new page." This enables compile-time detection of broken workflows.
3. **POM exposes the page's services, not its widgets.** Methods are named after the user-meaningful action (`addToCart`, `submitOrder`), not the DOM mechanic (`clickButton`, `typeIntoField`).

## Pattern 2 - Screenplay

**Canonical source:** [Antony Marcano, Andy Palmer, and Jan Molak - Serenity BDD documentation on Screenplay](https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals); origin article Marcano, Palmer, Molak and Smart, "Page Objects Refactored: SOLID Steps to the Screenplay/Journey Pattern," which traces the approach to Marcano's 2007 conception.

**The Screenplay vocabulary** ([Serenity BDD docs](https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals)):

| Term | Definition |
|---|---|
| **Actor** | The user or system performing tasks. "In Screenplay we model actors who interact with an application in various ways to perform tasks that help them achieve their goals." |
| **Ability** | A capability that enables actors to perform tasks (e.g., `BrowseTheWeb`, `CallAnApi`). |
| **Task** | A higher-level domain concept that groups Interactions (e.g., `Login`, `AddToCart`). |
| **Interaction** | A low-level operation (click, type, fetch). |
| **Question** | A query about system state used in assertions (e.g., `TheCartTotal.value()`). |

**Why Screenplay vs POM:** Screenplay separates *what the user does* (Tasks, Interactions) from *what the user can do* (Abilities) from *what the user observes* (Questions). The result is a SOLID-aligned object model that survives UI refactors better than POM in large suites.

## Pattern 3 - Component Object

**Canonical source:** Selenium HQ docs (Page Components are part of the official POM extension) + practitioner consensus (testing-library, Storybook, Playwright Component Testing). Treated as a refinement of POM, not a competing pattern.

**Definition:** A Component Object is a Page Object scoped to a UI component (header, nav, form, modal, card) rather than a whole page. Where a page contains a re-used component (the navbar appears on every page), the Component Object models that component once; each Page Object that contains it composes it in.

## Pattern 4 - App Actions (Cypress idiom)

**Canonical source:** [Gleb Bahmutov - "Application Actions: Use Them Instead of Page Objects" (Cypress blog, 2019)](https://www.cypress.io/blog/stop-using-page-objects-and-start-using-app-actions/).

**Definition:** App Actions bypass the UI for setup steps by exposing application functions (Redux dispatches, store mutations, API calls) directly via `cy.window().its('app')` or equivalent. The test still asserts via the UI; only the Arrange phase is short-circuited.

**Why App Actions vs POM:** "Logging in" is not what the test is about - it's overhead. App Actions skip the login UI flow and inject a session directly, making the test 10× faster and removing flake from the login form.

## Pattern 5 - Service Object

**Canonical source:** Ruby on Rails / Java enterprise testing patterns + practitioner blog consensus. Refinement of POM for non-UI test layers.

**Definition:** A Service Object is the API-test equivalent of a Page Object - it wraps a remote service (REST endpoint, GraphQL query, gRPC method, message-queue producer) with a domain API the test consumes. Methods like `cartService.addItem(sku, qty)` rather than `httpClient.post('/api/cart/items', { sku, qty })`.

## Pattern 6 - Repository (test-data access)

**Canonical source:** Martin Fowler's [Repository pattern](https://martinfowler.com/eaaCatalog/repository.html) (originally for domain-driven design) adapted for test-data setup. Practitioner adoption in 2020+ test frameworks (factory libraries layer on top).

**Definition:** A Repository in test context is the data-access abstraction that hides the storage mechanism (DB, fixture file, factory call) behind a domain API: `userRepo.createTestUser({ role: 'admin' })`.

## Pattern 7 - Screen Object (desktop / mobile sibling of Page Object)

**Canonical source:** Martin Fowler's PageObject article - the [current bliki entry](https://martinfowler.com/bliki/PageObject.html) defines it as an object that "wraps an HTML page, or fragment, with an application-specific API". The earlier name **WindowDriver** (Fowler, 2004) covered desktop GUI windows under the same encapsulation principle before the term migrated to web. The desktop / mobile community reuses the structurally-identical pattern under the name **Screen Object** (one class per logical screen, locators + actions encapsulated, no assertions inside). No single owner formally documents the rename - `screen object` is community-canonical across FlaUI, XCUITest, Appium / Espresso practitioner literature.

The mobile sibling is documented inside Google's Android testing guidance as **Screen Robot** ([Jake Wharton - *Instrumentation Testing Robots* (2016)](https://jakewharton.com/testing-robots/)) and inside Square's mobile literature as well; both reproduce the same encapsulation contract.

**The three load-bearing rules transfer unchanged from POM:**

1. **No assertions in the Screen Object body.** Same rationale Fowler gives for POM ("page objects … should not make assertions themselves"). The desktop test asserts on `window.Title`, `element.IsEnabled`, control-pattern state; the Screen Object exposes those via getters but does not verify them.
2. **Navigation methods return the next Screen Object.** `login.SubmitsCredentials()` returns `MainScreen`. Compile-time detection of broken workflows survives the migration from web POM to desktop Screen Object.
3. **Screen Object exposes the screen's services, not its widgets.** `login.SubmitsCredentials(creds)` not `login.LoginButton.Click()`. Methods are named after the user-meaningful action - same vocabulary rule as POM.

### Worked desktop example (FlaUI / xUnit)

**Bad** (mechanical leakage into the test body - same shape as the web POM anti-pattern):

```csharp
[StaFact]
public void Logs_in_with_valid_credentials() {
    var window = _fx.App.GetMainWindow(_fx.Automation);
    window.FindFirstDescendant(cf => cf.ByAutomationId("Username")).AsTextBox().Enter("alice@example.com");
    window.FindFirstDescendant(cf => cf.ByAutomationId("Password")).AsTextBox().Enter("hunter2");
    window.FindFirstDescendant(cf => cf.ByAutomationId("LoginButton")).AsButton().Invoke();
    Assert.Equal("Invoices", _fx.App.GetMainWindow(_fx.Automation).Title);
}
```

**Good** (Screen Object at the business layer):

```csharp
[StaFact]
public void Logs_in_with_valid_credentials() {
    var login = new LoginScreen(_fx.App.GetMainWindow(_fx.Automation));
    var main  = login.SubmitsCredentials("alice@example.com", "hunter2");
    Assert.Equal("Invoices", main.Title);
}
```

The mechanics live inside `LoginScreen` (constants for AutomationIds, retry-wrapped element fetches, `SubmitsCredentials` returns the next Screen Object). The test reads as a specification.

## Pattern selection matrix

The patterns are not equally good for every project. The matrix:

| Pattern | Best for | Avoid for |
|---|---|---|
| POM | Page-oriented web SUT, 3-50 engineers, classic frameworks | Component-first React/Vue (use Component Object); Cypress (consider App Actions) |
| Screenplay | Large suites (200+ tests), multiple actor types, SOLID enthusiasts | Small projects (overhead exceeds benefit); teams allergic to dependency injection |
| Component Object | React/Vue/Svelte component-architected SUT, Storybook-integrated | Server-rendered traditional pages (use POM) |
| App Actions | Cypress + Redux/store-architected SUT, setup-heavy tests | Critical-path / smoke tests (must exercise UI); SUT without programmatic state API |
| Service Object | API / integration / contract tests with 5+ services | UI-only tests (no service calls); contract tests via schemathesis (the tool generates its own client) |
| Repository | Multi-data-source projects, DB + fixture + factory in one suite | Single-source projects (overhead exceeds benefit) |
| **Screen Object** | **Desktop / mobile SUT through any accessibility-tree backend (UIA, XCTest, AT-SPI, Appium / Espresso)** | **Pure web SUT (use POM); pure API tests (use Service Object)** |

## Cross-cutting anti-patterns (apply to any pattern)

| Anti-pattern | Why it fails |
|---|---|
| Mixing two object-model patterns in the same codebase | Engineers can't tell which to write; vocabulary drift accelerates |
| Inheritance hierarchies >2 levels deep (BasePage → AppPage → DomainPage → SpecificPage) | Depth-3+ chains break unpredictably on root-level changes (§A2) |
| Page / Component / Task / Service Objects holding mutable test data | Cross-test coupling; parallel-execution breakage |
| Public getter-style methods that expose locators (`get loginButton()`) | Defeats encapsulation; locators leak into test code |
| Object-model methods that wait, retry, or handle SUT errors | Hides flakiness; tests pass when they should fail loudly |
| Object-model classes that import test-framework assertion libraries | Implies assertions are happening inside; smell for the no-assertion rule |

## Hand-off targets

- **Pick the framework itself before applying these patterns** → `framework-choice-advisor` (in the qa-process plugin).
- **Test-data construction patterns (Builder / Factory / Fixture)** → `test-data-patterns` (in the qa-test-data plugin, sister catalog).
- **Test isolation / fixture lifecycle / parallel safety** → `test-isolation-patterns` (sister catalog).
- **Test step granularity and abstraction** → `test-step-design-patterns` (sister catalog).
- **Cross-file convention reference** → `test-code-conventions` (file-level companion).

## References

Canonical sources, each cited inline above at the rule it grounds:

- Fowler, *PageObject*: https://martinfowler.com/bliki/PageObject.html
- Selenium HQ, *Page Object Models*: https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/
- Marcano, Palmer, Molak, *Screenplay Fundamentals* (Serenity BDD): https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals
- Marcano, Palmer, Molak, Smart, *Page Objects Refactored: SOLID Steps to the Screenplay/Journey Pattern*: https://dzone.com/articles/page-objects-refactored-solid-steps-to-the-screenp
- Cypress team, *Stop using Page Objects and Start using App Actions*: https://www.cypress.io/blog/stop-using-page-objects-and-start-using-app-actions/
- Fowler, *Repository pattern*: https://martinfowler.com/eaaCatalog/repository.html
- Jake Wharton, *Instrumentation Testing Robots* (2016): https://jakewharton.com/testing-robots/
- Apple, *Testing with Xcode* - UI Testing chapter: https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/testing_with_xcode/chapters/09-ui_testing.html
- ISTQB glossary, *Service Virtualisation*: https://glossary.istqb.org/en_US/term/service-virtualization
- `desktop-test-strategy-reference` (qa-desktop), `test-code-conventions` - sibling catalogs.
