---
name: object-model-patterns
description: "Pure reference catalog of the canonical object-model architecture patterns for test automation frameworks — Page Object Model (Fowler), Screenplay (Marcano/Palmer/Hill), Component Object, App Actions (Cypress idiom), Service Object, and Repository — each with its canonical citation, when-to-use rules, refuse-to-mix anti-patterns, and a worked example. Distinct from `test-code-conventions` (file-level §1-§10) and from per-framework S1 skills (`playwright-testing` etc., tool-specific configuration). Preloaded by `framework-architecture-auditor` (A3) and `playwright-codegen-reviewer` (A3) as the architecture-tier reference for what each pattern actually is."
rating: 25
d6: 5
archetype: S2
---

# object-model-patterns

## Overview

This skill is a **pure reference** (S2) — no execution steps; it is the canonical catalog the [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md) and [`playwright-codegen-reviewer`](../../../qa-web-e2e/agents/playwright-codegen-reviewer.md) cite to determine "what good looks like" per pattern. The catalog complements [`test-code-conventions`](../test-code-conventions/SKILL.md) (which is file-level §1-§10) with the architecture-tier vocabulary.

## When to use

- Designing a new test automation framework — pick one canonical pattern; do not mix.
- Reviewing an existing framework's architecture — audit which pattern is in use and whether it is applied consistently.
- Migrating from one pattern to another (the most common migration: classic POM → Screenplay or POM → App Actions).
- Onboarding new engineers — point them at the canonical citation for the pattern the team uses.

Do **not** use this skill to:

- Author per-framework tool configuration — that's the per-framework S1 skill (`playwright-testing`, `cypress-testing`, etc.).
- Pick the framework itself — that's [`framework-choice-advisor`](../../../qa-process/skills/framework-choice-advisor/SKILL.md).
- Audit a running codebase against the chosen pattern — that's [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md), which preloads this skill.

## Pattern 1 — Page Object Model (POM)

**Canonical source:** [Martin Fowler's PageObject definition](https://martinfowler.com/bliki/PageObject.html) (the bliki article is the cross-language canonical reference) + [Selenium HQ documentation on Page Object Models](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/).

**Fowler's definition:** "A page object wraps an HTML page, or fragment, with an application-specific API, allowing you to manipulate page elements without digging around in the HTML."

**Selenium HQ's elaboration:** "A page object is an object-oriented class that serves as an interface to a page of your AUT… There is a clean separation between the test code and page-specific code, such as locators."

**The three load-bearing rules:**

1. **No assertions in the POM body.** Fowler: "Page objects are most commonly used in testing, but should not make assertions themselves." Selenium HQ: "Page objects themselves should never make verifications or assertions. This is part of your test and should always be within the test's code, never in a page object." One narrow exception (Selenium HQ): a verification at instantiation that the page loaded.
2. **Navigation methods return the next POM.** Fowler: "If you navigate to another page, the initial page object should return another page object for the new page." This enables compile-time detection of broken workflows.
3. **POM exposes the page's services, not its widgets.** Methods are named after the user-meaningful action (`addToCart`, `submitOrder`), not the DOM mechanic (`clickButton`, `typeIntoField`).

### When to use POM

- The SUT is page-oriented (traditional multi-page web app, server-rendered).
- The team has 3+ engineers and needs locator deduplication.
- The framework is Selenium / WebdriverIO / classic Playwright codegen output.

### Anti-patterns (canonical)

| Anti-pattern | Why it fails |
|---|---|
| Assertions inside the POM | Couples the page model to test outcomes; reuse across tests becomes brittle |
| `void`-returning navigation methods | Loses the compile-time check Fowler explicitly identifies as the pattern's benefit |
| `clickAddToCartButton()` instead of `addToCart()` | Couples the test vocabulary to UI mechanics — when the UI changes, every test changes |
| Exposing the underlying WebDriver / Page instance through public POM methods | Leaks framework details into tests; defeats the encapsulation |
| One God-POM serving five pages | Violates single-responsibility; bigger refactor cost than the POM was supposed to prevent |

## Pattern 2 — Screenplay

**Canonical source:** [Antony Marcano, Andy Palmer, and Jan Molak — Serenity BDD documentation on Screenplay](https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals); origin paper Marcano & Hill 2007 "Page Objects Refactored: SOLID Steps to the Screenplay Pattern."

**The Screenplay vocabulary** ([Serenity BDD docs](https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals)):

| Term | Definition |
|---|---|
| **Actor** | The user or system performing tasks. "In Screenplay we model actors who interact with an application in various ways to perform tasks that help them achieve their goals." |
| **Ability** | A capability that enables actors to perform tasks (e.g., `BrowseTheWeb`, `CallAnApi`). |
| **Task** | A higher-level domain concept that groups Interactions (e.g., `Login`, `AddToCart`). |
| **Interaction** | A low-level operation (click, type, fetch). |
| **Question** | A query about system state used in assertions (e.g., `TheCartTotal.value()`). |

**Why Screenplay vs POM:** Screenplay separates *what the user does* (Tasks, Interactions) from *what the user can do* (Abilities) from *what the user observes* (Questions). The result is a SOLID-aligned object model that survives UI refactors better than POM in large suites.

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

## Pattern 3 — Component Object

**Canonical source:** Selenium HQ docs (Page Components are part of the official POM extension) + practitioner consensus (testing-library, Storybook, Playwright Component Testing). Treated as a refinement of POM, not a competing pattern.

**Definition:** A Component Object is a Page Object scoped to a UI component (header, nav, form, modal, card) rather than a whole page. Where a page contains a re-used component (the navbar appears on every page), the Component Object models that component once; each Page Object that contains it composes it in.

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

## Pattern 4 — App Actions (Cypress idiom)

**Canonical source:** [Kent C. Dodds and the Cypress team — "Stop using Page Objects and Start using App Actions" (Cypress blog)](https://www.cypress.io/blog/stop-using-page-objects-and-start-using-app-actions/).

**Definition:** App Actions bypass the UI for setup steps by exposing application functions (Redux dispatches, store mutations, API calls) directly via `cy.window().its('app')` or equivalent. The test still asserts via the UI; only the Arrange phase is short-circuited.

**Why App Actions vs POM:** "Logging in" is not what the test is about — it's overhead. App Actions skip the login UI flow and inject a session directly, making the test 10× faster and removing flake from the login form.

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

## Pattern 5 — Service Object

**Canonical source:** Ruby on Rails / Java enterprise testing patterns + practitioner blog consensus. Refinement of POM for non-UI test layers.

**Definition:** A Service Object is the API-test equivalent of a Page Object — it wraps a remote service (REST endpoint, GraphQL query, gRPC method, message-queue producer) with a domain API the test consumes. Methods like `cartService.addItem(sku, qty)` rather than `httpClient.post('/api/cart/items', { sku, qty })`.

### When to use Service Object

- API / contract / integration tests where the test code calls an HTTP / gRPC / queue interface repeatedly.
- The SUT has 5+ services and the test code would otherwise be drowning in HTTP boilerplate.
- The team uses Pact, schemathesis, RestAssured, Karate, or any framework with raw HTTP at the test layer.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Service Object that re-implements the production service (mocks-in-disguise) | Tests against a fake instead of the real service; misses contract drift |
| Service Object with assertions inside | Same anti-pattern as POM assertions — couples model to test outcomes |
| Single Service Object for 10 different services | Violates single-responsibility; the object becomes a god-client |
| Service Object that handles retries / circuit breakers identical to production | Tests pass because the Service Object hides the failures the test should catch |

## Pattern 6 — Repository (test-data access)

**Canonical source:** Martin Fowler's [Repository pattern](https://martinfowler.com/eaaCatalog/repository.html) (originally for domain-driven design) adapted for test-data setup. Practitioner adoption in 2020+ test frameworks (factory libraries layer on top).

**Definition:** A Repository in test context is the data-access abstraction that hides the storage mechanism (DB, fixture file, factory call) behind a domain API: `userRepo.createTestUser({ role: 'admin' })`.

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

## Cross-cutting anti-patterns (apply to any pattern)

| Anti-pattern | Why it fails |
|---|---|
| Mixing two object-model patterns in the same codebase | Engineers can't tell which to write; vocabulary drift accelerates |
| Inheritance hierarchies >2 levels deep (BasePage → AppPage → DomainPage → SpecificPage) | Per [`framework-architecture-auditor §A2`](../../agents/framework-architecture-auditor.md), depth-3+ chains break unpredictably on root-level changes |
| Page / Component / Task / Service Objects holding mutable test data | Cross-test coupling; parallel-execution breakage |
| Public getter-style methods that expose locators (`get loginButton()`) | Defeats encapsulation; locators leak into test code |
| Object-model methods that wait, retry, or handle SUT errors | Hides flakiness; tests pass when they should fail loudly |
| Object-model classes that import test-framework assertion libraries | Implies assertions are happening inside; smell for the no-assertion rule |

## Hand-off targets

- **Audit an existing framework against these patterns** → [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md) (preloads this skill).
- **Per-file convention review** → [`test-code-critic`](../../agents/test-code-critic.md) (different scope: file-level §1-§10).
- **Refactor raw codegen into POMs** → [`playwright-codegen-reviewer`](../../../qa-web-e2e/agents/playwright-codegen-reviewer.md).
- **Pick the framework itself before applying these patterns** → [`framework-choice-advisor`](../../../qa-process/skills/framework-choice-advisor/SKILL.md).
- **Test-data construction patterns (Builder / Factory / Fixture)** → [`test-data-patterns`](../../../qa-test-data/skills/test-data-patterns/SKILL.md) (sister catalog).
- **Test isolation / fixture lifecycle / parallel safety** → [`test-isolation-patterns`](../test-isolation-patterns/SKILL.md) (sister catalog).
- **Test step granularity and abstraction** → [`test-step-design-patterns`](../test-step-design-patterns/SKILL.md) (sister catalog).
- **Cross-file convention reference** → [`test-code-conventions`](../test-code-conventions/SKILL.md) (file-level companion).

## References

- Martin Fowler — *PageObject* (canonical cross-language definition, the load-bearing reference for all POM rules): https://martinfowler.com/bliki/PageObject.html
- Selenium HQ — *Page Object Models* (official Selenium documentation; quotes the no-assertions and navigation-return-shape rules verbatim): https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/
- Antony Marcano, Andy Palmer, Jan Molak — *Screenplay Fundamentals* (Serenity BDD documentation; the canonical Actor/Ability/Task/Interaction/Question vocabulary): https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals
- Marcano & Hill (2007) — *Page Objects Refactored: SOLID Steps to the Screenplay Pattern* (the origin paper for the Screenplay name and SOLID rationale; cited via Serenity BDD): https://serenity-bdd.github.io/docs/screenplay/
- Kent C. Dodds + Cypress team — *Stop using Page Objects and Start using App Actions* (Cypress blog, the canonical App Actions reference): https://www.cypress.io/blog/stop-using-page-objects-and-start-using-app-actions/
- Martin Fowler — *Repository pattern* (originally domain-driven design; cited for test-data Repository adaptation): https://martinfowler.com/eaaCatalog/repository.html
- ISTQB glossary — Page Object (the canonical ISTQB entry confirming the pattern is industry-standard): https://glossary.istqb.org/en_US/term/page-object
- ISTQB glossary — Service Virtualisation (related concept; the Service Object is the test-side counterpart): https://glossary.istqb.org/en_US/term/service-virtualization
- [`test-code-conventions`](../test-code-conventions/SKILL.md) — file-level companion (§1-§10).
- [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md) — the A3 that audits codebases against these patterns; preloads this skill.
- [`playwright-codegen-reviewer`](../../../qa-web-e2e/agents/playwright-codegen-reviewer.md), [`spec-to-e2e-test-scaffolder`](../../../qa-web-e2e/agents/spec-to-e2e-test-scaffolder.md) — agents that apply these patterns.
