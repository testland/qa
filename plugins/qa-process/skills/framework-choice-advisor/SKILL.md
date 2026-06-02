---
name: framework-choice-advisor
description: "Pure reference catalog for picking a test automation framework - covers Playwright / Cypress / Selenium / WebdriverIO / Appium / Espresso / XCUITest / RestAssured / Karate / k6 / Locust with side-by-side tradeoffs on speed, cross-browser, mobile, parallelisation, language support, ecosystem maturity, CI integration; a decision tree for matching project NFRs to framework choice; and reference directory / fixture / CI layouts for the chosen stack. Distinct from the per-framework S1 skills (`playwright-testing`, `cypress-testing`, etc.) which document configuration once a framework is chosen - this skill is the **upstream selection step**. Distinct from `test-pyramid-balancer` (which tunes the layer mix for an existing suite). Use when starting a new test-automation suite from scratch, before installing any tool."
rating: 24
d6: 4
archetype: S2
---

# framework-choice-advisor

## Overview

A team is starting a new test automation suite and needs to pick the stack: framework, runner, assertion library, reporter, CI integration, fixture system, parallelisation strategy, retry policy. Most "AI for testing" tooling pretends to scaffold the whole framework for you in one shot - per the [2025 World Quality Report](https://www.capgemini.com/insights/research-library/world-quality-report-2025-26/), this is exactly the integration-friction failure mode (37% of teams cite integration friction as the dominant AI-in-testing blocker). The honest deliverable is **decision support**, not auto-scaffolding.

This skill is a **pure reference** (S2): a decision tree + tradeoff matrix the team uses as a checklist. It does not generate framework boilerplate. After the team picks a stack, the per-framework S1 skills (`playwright-testing`, `cypress-testing`, etc.) document the configuration; this skill stops at "you picked Playwright + Jest, here's the canonical directory layout to use".

## When to use

- Greenfield: starting a new test automation suite from zero.
- Migration: the team is moving off a legacy framework (most commonly Selenium → Playwright per [TestDino's 2026 flake benchmark](https://testdino.com/blog/flaky-test-benchmark) - teams report "50% fewer flaky tests" after migration).
- Multi-stack consolidation: the team has three frameworks across product areas and is deciding which to standardise on.
- Hiring-driven re-evaluation: the team's skills mix shifted (e.g., from Java to TypeScript) and the framework choice should follow.

Do **not** use this skill when:

- The framework is already chosen and the team needs configuration / API help - use the per-framework S1 skill ([`playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md), [`cypress-testing`](../../../qa-web-e2e/skills/cypress-testing/SKILL.md), etc.).
- The team's question is "should we add E2E vs unit vs contract tests" - that's [`test-pyramid-balancer`](../test-pyramid-balancer/SKILL.md).
- Mobile-native vs hybrid app selection - use the [`qa-mobile-native`](../../../qa-mobile-native/) plugin's documentation directly.

## Step 1 - Frame the decision against the project's NFRs

Six NFR axes drive framework choice. Score each 1 - 5 for the project; rank them by priority. The framework matrix in Step 2 uses these scores.

| NFR axis | Question |
|---|---|
| **Cross-browser scope** | Is multi-browser execution required? (Chromium-only? + Firefox + WebKit? + IE/Edge legacy?) |
| **Mobile scope** | Real device + emulator? Hybrid app webview? Native-only? Or web-mobile-viewport only? |
| **Team language** | What languages do the engineers already know? (Avoiding the framework-language mismatch is the #1 maintenance cost.) |
| **Execution speed** | Parallel-shard target - minutes for the full suite. CI-cost-driven? |
| **Ecosystem maturity** | Third-party integrations the team needs (visual regression, accessibility, perf, contract). |
| **Hire-ability** | Can the team hire engineers familiar with the framework? Smaller frameworks → smaller talent pool. |

## Step 2 - Framework tradeoff matrix (web E2E)

| Framework | Cross-browser | Mobile | Language | Speed (parallel) | Ecosystem | Hire-ability | Notes |
|---|---|---|---|---|---|---|---|
| **Playwright** | Chromium / Firefox / WebKit native, all in one runtime | Mobile-viewport emulation + real device via Playwright Mobile (beta) | TS / JS / Python / .NET / Java | Excellent (auto-parallel, sharding built-in) | Strong (trace viewer, visual snapshots, fixtures, MCP integration) | High (fastest-growing 2024-26) | The default for greenfield web E2E in 2026 per [TestDino](https://testdino.com/blog/flaky-test-benchmark). Auto-wait reduces flake by ~50% vs Selenium. |
| **Cypress** | Chromium-family + Firefox + WebKit (newer) | Mobile viewport only; no real-device | JS / TS only | Good (parallel via Cypress Cloud; CLI-parallel limited) | Strong (huge plugin ecosystem) | High | Strong DX for component testing; runs inside-browser limits cross-origin and iframe scenarios. |
| **Selenium / WebdriverIO** | All browsers via WebDriver protocol | Real device via Appium | All major languages (Java / Python / C# / JS / Ruby) | Moderate (Selenium Grid; WDIO improves on Selenium's runner) | Mature (oldest ecosystem) | Highest (historical talent pool) | Mature but flake-prone vs Playwright per [TestDino 2026](https://testdino.com/blog/flaky-test-benchmark) - async-wait issues are the dominant cause. Migration target, not greenfield default. |
| **TestCafe** | All browsers; proxy-based (no WebDriver) | Mobile via emulators | JS / TS | Moderate | Smaller ecosystem | Lower | Niche; integrated runner. |
| **Puppeteer** | Chromium-only natively (Firefox via experimental) | Limited | JS / TS | Good | Smaller than Playwright | Lower | Mostly superseded by Playwright (the team that built Puppeteer started Playwright). |

The 2026-recommendation tree for greenfield web E2E:
- **Multi-browser required + multi-language team** → Playwright.
- **Single-browser (Chromium) + JS-only team** → Playwright or Cypress; Cypress has stronger component-testing DX.
- **Legacy / migration off existing Selenium suite** → either incremental migration to Playwright (preferred) or modernise the Selenium suite via WebdriverIO's runner ergonomics.

## Step 3 - Framework tradeoff matrix (other test layers)

### Mobile native

| Framework | Platform | Language | Notes |
|---|---|---|---|
| **Espresso** | Android native | Kotlin / Java | Google's first-party. In-process, fast, deterministic. |
| **XCUITest** | iOS native | Swift / Obj-C | Apple's first-party. In-process. |
| **Appium** | iOS + Android (and others) | All major | Cross-platform unifier; trades depth for breadth. WebDriver-based - same flake patterns as Selenium. |
| **Detox** | React Native | JS / TS | RN-specialist; grey-box testing. |

Decision: if the team is single-platform native (iOS only or Android only), use the first-party framework. Cross-platform → Appium, accept the WebDriver flake-tax. React-Native specifically → Detox.

### API / contract

| Framework | Scope | Language | Notes |
|---|---|---|---|
| **RestAssured** | REST API integration tests | Java / Kotlin | The JVM-default; mature, deeply integrated with JUnit / TestNG. |
| **Karate** | REST + SOAP + GraphQL + gRPC | Karate DSL (Cucumber-like) | DSL-first; lowers barrier for non-Java testers. |
| **schemathesis** | OpenAPI / GraphQL property-based fuzzing | Python | Generative; complements example-based tests. See [`contract-test-scaffolder`](../../../qa-contract-testing/agents/contract-test-scaffolder.md). |
| **Pact** | Consumer-driven contract tests | JS / JVM / Python / Go / Ruby / .NET | Different category - contract, not integration. See [`pact-contract-testing`](../../../qa-contract-testing/skills/pact-contract-testing/SKILL.md). |
| **Postman / Newman** | Collection-driven API tests | Postman DSL | UI-driven authoring; not code-first. Often used by non-engineers. |

### Performance

| Framework | Scope | Language | Notes |
|---|---|---|---|
| **k6** | Load + perf, code-first | JS (with TS support) | Grafana's; lowest barrier for engineers, excellent CI integration. |
| **Locust** | Load + perf, code-first | Python | Open-source; user-class-based modelling. |
| **JMeter** | Load + perf, GUI-first | XML config | Mature, ecosystem-heavy; GUI-driven authoring is the trade-off. |
| **Gatling** | Load + perf, code-first | Scala / Java / Kotlin | High-throughput; JVM stack. |

## Step 4 - Reference directory layouts

After the team has chosen a stack, this skill provides the **canonical directory layout** the per-framework S1 skill assumes. Layouts are conventions, not mandates - every project has reasons to deviate, but the canonical layout is the starting point a newcomer can read.

### Playwright + Jest (TypeScript) - the 2026 default for web E2E

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── login.fixture.ts
│   ├── cart/
│   │   ├── add-item.spec.ts
│   │   └── checkout.spec.ts
│   └── pages/                  # Page Objects (per Martin Fowler's pattern)
│       ├── LoginPage.ts
│       ├── CartPage.ts
│       └── CheckoutPage.ts
├── helpers/
│   ├── api-client.ts            # HTTP client for setup / teardown
│   ├── test-data.ts             # Fixtures and seeds
│   └── selectors.ts             # Shared accessibility-first locators
├── fixtures/                    # Static test data
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

Conventions:
- One `*.spec.ts` per feature flow; one Page Object per page or major component.
- Fixtures scoped to `describe` blocks; global fixtures are an anti-pattern (see [`test-code-conventions`](../../../qa-test-review/skills/test-code-conventions/SKILL.md) §6).
- Page Objects per [Martin Fowler's definition](https://martinfowler.com/bliki/PageObject.html): "a page object wraps an HTML page... with an application-specific API." Page Objects do **not** make assertions; they return state or the next Page Object on navigation.

### Cypress + Mocha (TypeScript)

```
cypress/
├── e2e/
│   ├── auth/login.cy.ts
│   └── cart/checkout.cy.ts
├── support/
│   ├── commands.ts              # Custom Cypress commands
│   ├── pages/                   # Page Objects (Cypress idiom: command-based, not class-based)
│   └── e2e.ts
├── fixtures/
├── cypress.config.ts
└── package.json
```

Cypress idiom prefers custom commands over class-based POMs; the directory layout reflects that.

### Selenium / WebdriverIO (TypeScript or Java)

```
test/
├── specs/
│   ├── auth/login.spec.ts
│   └── cart/checkout.spec.ts
├── pageobjects/
│   ├── login.page.ts
│   └── cart.page.ts
├── helpers/
├── wdio.conf.ts
└── package.json
```

WDIO's runner ergonomics improve on raw Selenium; the layout is conventional.

## Step 5 - CI integration patterns

Universal across frameworks:

| Concern | Convention |
|---|---|
| **Parallelisation** | Shard by file (Playwright `--shard=X/Y`, Cypress Cloud, WDIO `maxInstances`). Aim for 5 - 10 minute wall-clock for the full suite per shard. |
| **Retries** | Retry once on first failure; never retry locally (only CI). Tests retried >1× are flake candidates - feed to [`failure-classifier`](../../../qa-bug-repro/agents/failure-classifier.md). |
| **Trace / video** | Capture on-first-retry (off for green runs to save storage). Playwright `trace: 'on-first-retry'` is the default; Cypress + `cypress-video-trim` similar. |
| **Reporting** | JUnit XML output for the CI's test-result panel; Allure for human reporting; both via plugin. |
| **Secrets** | Load from CI secret store (GitHub Actions Secrets, GitLab CI Variables); never commit. |
| **Environment matrix** | One job per `(framework, browser, environment)` cell; do not mix in one job. |

## Step 6 - When to defer the decision

The skill recommends **deferring framework choice** when:

- The product surface is too new - no stable URL / API to test against.
- The team's required languages aren't decided yet (hiring in progress).
- The team is debating monolith vs micro-frontend; the framework choice depends on the product architecture.

In these cases, the right output is an **explicit deferral note**: "no decision today; revisit when (a)/(b)/(c) resolves."

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Picking the framework before the NFRs are scored | Choice driven by hype, not fit; high migration cost when the wrong framework can't deliver. | Step 1 - score the NFRs first. |
| Standardising on one framework across every test layer | Different layers need different tools (Playwright for E2E ≠ k6 for perf ≠ Pact for contract). | Pick per layer; the stack is multiple frameworks. |
| Picking Selenium for greenfield in 2026 | Selenium's WebDriver-based async-wait model is the dominant flake cause per [TestDino 2026](https://testdino.com/blog/flaky-test-benchmark). | Use Playwright for greenfield; reserve Selenium for legacy maintenance. |
| Cross-language teams picking a single-language framework | Engineers can't contribute; suite becomes one person's domain. | Either pick a multi-language framework (Playwright / Selenium) or commit to retraining. |
| Adopting a framework because a contractor used it | Contractor leaves; team can't maintain. | Hire-ability is an NFR. |
| Skipping the directory-layout convention | Every newcomer authoring tests in a different shape; review burden grows. | Step 4 - pick a canonical layout up front, even if you deviate later. |
| Treating this skill as "framework recommender" rather than "decision support" | The skill recommends; the team decides. Automating the decision strips accountability. | The output of this skill is a documented choice, not an automatic install. |

## Limitations

- **Coverage is the web / mobile / API / perf canonical set.** Specialised layers (desktop apps via Spectron / Tauri, embedded devices, hardware-in-loop) are out of scope.
- **Tradeoff matrix is point-in-time.** Frameworks evolve quickly; the 2026 ranking will be stale in 18 months. Re-read this skill before every greenfield decision.
- **Tradeoffs are illustrative.** A specific product can have constraints that flip the recommendation - e.g., a Salesforce internal app where the legacy stack is JVM-only would override the "Playwright by default" guidance.
- **Hire-ability is geography-dependent.** "Hire-ability" assumes US / EU markets in the matrix; for other markets, the team's local pool is the authority.
- **No automated framework scaffolding.** Per the introduction, this is intentional - auto-scaffolded boilerplate is the dominant failure mode the [research](https://www.capgemini.com/insights/research-library/world-quality-report-2025-26/) flags. Use the per-framework S1 skill after the decision.
- **No closed-platform comparison.** Mabl / Testim / Functionize / TestSigma are no-code platforms; they compete with this entire category, not with one framework. If the team is choosing "code vs no-code", that's a strategic decision beyond this skill's scope.

## Hand-off targets

- **After the framework is chosen, configure it** → per-framework S1 skill ([`playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md), [`cypress-testing`](../../../qa-web-e2e/skills/cypress-testing/SKILL.md), [`selenium-testing`](../../../qa-web-e2e/skills/selenium-testing/SKILL.md), [`webdriverio-testing`](../../../qa-web-e2e/skills/webdriverio-testing/SKILL.md)).
- **Tune the layer balance after the framework is in place** → [`test-pyramid-balancer`](../test-pyramid-balancer/SKILL.md).
- **Author the first scaffold** → [`spec-to-e2e-test-scaffolder`](../../../qa-web-e2e/agents/spec-to-e2e-test-scaffolder.md).
- **Audit the framework after it's grown for 6+ months** → [`framework-architecture-auditor`](../../../qa-test-review/agents/framework-architecture-auditor.md) (sibling, in `qa-test-review`).
- **Convert Selenium suite → Playwright (the most common 2026 migration)** → migration is a project, not an agent; this skill provides the decision input, the per-framework S1 skills provide the target configuration.

## References

- Playwright official documentation - locator hierarchy, trace viewer, parallel sharding: https://playwright.dev/
- Cypress documentation: https://docs.cypress.io/
- WebdriverIO documentation: https://webdriver.io/
- Martin Fowler - Page Object pattern (canonical definition): https://martinfowler.com/bliki/PageObject.html
- TestDino Flaky Test Benchmark 2026 - Selenium → Playwright migration data (50% fewer flakes); 45% async-wait root-cause share: https://testdino.com/blog/flaky-test-benchmark
- Capgemini World Quality Report 2025-26 - 37% cite integration friction as the dominant AI-in-testing blocker (justifies why this is decision-support, not auto-scaffolding): https://www.capgemini.com/insights/research-library/world-quality-report-2025-26/
- ISTQB glossary - test automation framework: https://glossary.istqb.org/en_US/term/test-automation-framework
- ISTQB glossary - keyword-driven testing (relevant to Karate / Postman DSL choice): https://glossary.istqb.org/en_US/term/keyword-driven-testing
- ISO/IEC 25010 - quality characteristics (used in Step 1 NFR scoring): https://en.wikipedia.org/wiki/ISO/IEC_25010
- [`playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md), [`cypress-testing`](../../../qa-web-e2e/skills/cypress-testing/SKILL.md), [`selenium-testing`](../../../qa-web-e2e/skills/selenium-testing/SKILL.md), [`webdriverio-testing`](../../../qa-web-e2e/skills/webdriverio-testing/SKILL.md) - downstream per-framework configuration skills.
- [`test-pyramid-balancer`](../test-pyramid-balancer/SKILL.md) - layer-mix tuning after the framework is in place.
- [`framework-architecture-auditor`](../../../qa-test-review/agents/framework-architecture-auditor.md) - sibling agent for auditing an existing framework's architecture.
