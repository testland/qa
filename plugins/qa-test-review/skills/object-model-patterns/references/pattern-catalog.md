# object-model-patterns - when-to-use rules and anti-patterns

Per-pattern selection detail for `object-model-patterns`. Each pattern's
definition, canonical citation, and load-bearing rules stay in `SKILL.md`, and
the quick chooser is the pattern selection matrix there. This file carries the
detailed when-to-use rules and the per-pattern anti-pattern tables.

## Pattern 1 - Page Object Model (POM)

### When to use POM

- The SUT is page-oriented (traditional multi-page web app, server-rendered).
- The team has 3+ engineers and needs locator deduplication.
- The framework is Selenium / WebdriverIO / classic Playwright codegen output.

### Anti-patterns (canonical)

| Anti-pattern | Why it fails |
|---|---|
| Assertions inside the POM | Couples the page model to test outcomes; reuse across tests becomes brittle |
| `void`-returning navigation methods | Loses the compile-time check Fowler explicitly identifies as the pattern's benefit |
| `clickAddToCartButton()` instead of `addToCart()` | Couples the test vocabulary to UI mechanics - when the UI changes, every test changes |
| Exposing the underlying WebDriver / Page instance through public POM methods | Leaks framework details into tests; defeats the encapsulation |
| One God-POM serving five pages | Violates single-responsibility; bigger refactor cost than the POM was supposed to prevent |

## Pattern 2 - Screenplay

### When to use Screenplay

- The framework will exceed ~200 tests; the SOLID separation pays off at scale.
- The team has Java / Kotlin / TypeScript / Python engineers who appreciate dependency-injection-style composition.
- The SUT has multiple actor types (admin user, anonymous user, API client) that share underlying UI/API interactions.
- The team uses Serenity BDD, SerenityJS, Boa Constrictor (.NET), or Screenplay-style implementations.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Mixing Screenplay and POM in the same codebase | Doubles the maintenance surface; engineers can't tell which to write |
| Tasks that do not call Interactions (Task = re-named POM method) | Loses the Screenplay benefit; the team got Page Object Model under a different name |
| Question classes that mutate state | Violates the Question's "pure observation" contract; assertions on observations fail unpredictably |
| Abilities used as a junk-drawer for utilities | The Ability should grant a real capability; using it as a service-locator defeats the dependency-injection benefit |

## Pattern 3 - Component Object

### When to use Component Object

- The SUT is component-architected (React, Vue, Svelte, Angular, Web Components).
- A small number of components appear on every page (navbar, footer, search box, modal).
- Storybook / per-component visual testing is part of the suite.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Modelling every DOM element as a Component Object | Component Objects are for re-used components, not every `<div>` |
| Component Objects that hold cross-component state | Violates the encapsulation; the component should not know which page contains it |
| Page Objects that bypass the Component Object and target its internals | The Component Object's locators get duplicated; refactor leakage |

## Pattern 4 - App Actions (Cypress idiom)

### When to use App Actions

- The framework is Cypress (the pattern is named after the Cypress idiom; other frameworks adapt it).
- The SUT exposes a deterministic state-setting API (Redux store, programmatic auth).
- Setup is dominated by repeated UI flows (login, seed cart, navigate-to-deep-page).
- The team is willing to accept the lock-in to the SUT's internal API surface.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| App Actions for the Act phase (the thing under test) | The test no longer verifies the UI path under test |
| App Actions that aren't documented as test-only surface | Production code accidentally depends on the test-only API |
| Mixing App Actions and POM without convention | Engineers can't tell which to use; the suite forks |
| App Actions for end-to-end smoke / critical-path tests | Critical paths must exercise the full UI; App Actions skip the very thing the smoke proves |

## Pattern 5 - Service Object

### When to use Service Object

- API / contract / integration tests where the test code calls an HTTP / gRPC / queue interface repeatedly.
- The SUT has 5+ services and the test code would otherwise be drowning in HTTP boilerplate.
- The team uses Pact, schemathesis, RestAssured, Karate, or any framework with raw HTTP at the test layer.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Service Object that re-implements the production service (mocks-in-disguise) | Tests against a fake instead of the real service; misses contract drift |
| Service Object with assertions inside | Same anti-pattern as POM assertions - couples model to test outcomes |
| Single Service Object for 10 different services | Violates single-responsibility; the object becomes a god-client |
| Service Object that handles retries / circuit breakers identical to production | Tests pass because the Service Object hides the failures the test should catch |

## Pattern 6 - Repository (test-data access)

### When to use Repository

- The framework needs deterministic test-data setup across DB / fixture file / factory.
- Multiple test types (unit / integration / E2E) need the same setup logic.
- The data-source mechanism is likely to change (DB schema migration, factory library swap).

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Repository that mixes test setup with production data fetching | Production code accidentally adopts test-only quirks |
| Repository methods that return mutable objects shared across tests | Test cross-coupling; one test mutates and breaks another |
| Repository that creates "magic" data the test doesn't see | Tests pass for inscrutable reasons; debugging is impossible |

## Pattern 7 - Screen Object (desktop / mobile sibling of Page Object)

### When to use Screen Object

- Desktop / mobile SUT routed through any accessibility-tree backend per `desktop-test-strategy-reference` (in the qa-desktop plugin): Windows UIA (FlaUI, WinAppDriver, Appium-Windows), macOS XCTest (XCUIApplication / XCUIElementQuery per [Apple's *Testing with Xcode* UI Testing chapter](https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/testing_with_xcode/chapters/09-ui_testing.html)), Linux AT-SPI (dogtail / pyatspi).
- Mobile-native SUT (Appium, Espresso, XCUITest on iOS) - same encapsulation, sometimes branded "Screen Robot" per the Wharton citation in SKILL.md.
- Cross-platform desktop frameworks (Avalonia, .NET MAUI) where the same screen exists across OSes but the accessibility backend differs per host.

### Anti-patterns (Screen Object-specific in addition to the POM list)

| Anti-pattern | Why it fails |
|---|---|
| Screen Object that hard-codes `AutomationId` strings inline in every method (e.g. `cf.ByAutomationId("LoginButton")` repeated) | Refactor cost when the developer renames the AutomationId; centralise the constant at the top of the Screen class |
| Screen Object that wraps a single accessibility-tree call without adding a domain method | Same anti-pattern as the POM `clickAddToCartButton()` smell - Screen exposes mechanic, not service |
| Screen Object that asserts on accessibility properties (role, label) it controls | Asserting on internal state defeats the no-assertions rule; assertions belong in the test |
| Screen Object that calls `Thread.Sleep` / `Task.Delay` between actions | Hides flakiness; route through the driver's retry primitive (FlaUI `Retry.WhileNull`, XCTest `waitForExistence`) |
| Screen Object that depends on absolute window coordinates | Defeats the accessibility-tree abstraction; multi-monitor / DPI / locale breaks the test |
| One Screen Object class per dialog AND per main view in the same screen | Modal sub-screens are nested Screen Objects; do not flatten |
