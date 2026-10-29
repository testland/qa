---
name: framework-choice-advisor
description: "Reference catalog for picking a test automation framework or QA tool - covers Playwright / Cypress / Selenium / WebdriverIO / Appium / Espresso / XCUITest / RestAssured / Karate / k6 / Locust with side-by-side tradeoffs on speed, cross-browser, mobile, parallelisation, language support, ecosystem maturity, CI integration; a decision tree matching project NFRs to framework choice; and reference layouts for the chosen stack. references/ extends the same decision to commercial procurement (seven-axis vendor evaluation for TCM platforms, no-code tools, visual-regression services) and to recording the outcome (ADR-based tool-selection decision record with signal, one recommendation, flip conditions). This is the upstream selection step: it decides which tool to adopt, not how to configure one already chosen. Use when starting a new test-automation suite, evaluating commercial QA vendors, or writing down a tool decision."
---

# framework-choice-advisor

## Overview

Decision support for picking a test stack (framework, runner, reporter, CI shape): score the project's needs, compare per layer, then record one decision or an explicit deferral. It does not generate boilerplate; after the choice, the per-framework skill (`playwright-testing`, `cypress-testing`, ...) configures it.

## When to use

- Greenfield: starting a new test automation suite from zero.
- Migration: the team is moving off a legacy framework (for example Selenium to Playwright).
- Multi-stack consolidation: the team has three frameworks across product areas and is deciding which to standardise on.
- Hiring-driven re-evaluation: the team's skills mix shifted (e.g., from Java to TypeScript) and the framework choice should follow.

Do **not** use this skill when:

- The framework is already chosen and the team needs configuration / API help - use the per-framework skill (`playwright-testing`, `cypress-testing`, etc.).
- The team's question is "should we add E2E vs unit vs contract tests" - that's `test-pyramid-balancer`.
- Mobile-native vs hybrid app selection - use the `qa-mobile` plugin's documentation directly.

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

**Checkpoint before Step 2.** Write the six scores down, each with the
evidence behind it (a manifest line, a CI wall-clock figure, the team's
language list, a roadmap item with a date), and get the team to confirm
the ranking. If a top-ranked axis cannot be scored from evidence today
(language not decided, no stable product surface), stop and go to
Step 6 (defer) instead of reading the matrix. A roadmap line ("Android
in H2") is a condition that would reopen the decision, not a score.

## Step 2 - Framework tradeoff matrix (web E2E)

| Framework | Cross-browser | Mobile | Language | Speed (parallel) | Ecosystem | Hire-ability | Notes |
|---|---|---|---|---|---|---|---|
| **Playwright** | Chromium / Firefox / WebKit native, all in one runtime | Mobile-viewport emulation; experimental Android support (Chrome for Android, WebView) ([Android API](https://playwright.dev/docs/api/class-android)) | TS / JS / Python / .NET / Java | Excellent (auto-parallel, sharding built-in) | Strong (trace viewer, visual snapshots, fixtures, MCP integration) | High | A common default for greenfield web E2E; its built-in auto-waiting removes the manual-wait flakiness that dominates Selenium suites ([Playwright actionability](https://playwright.dev/docs/actionability)). |
| **Cypress** | Chromium-family + Firefox; WebKit only behind `experimentalWebKitSupport` ([experiments](https://docs.cypress.io/app/references/experiments)) | Mobile viewport only; no real-device | JS / TS only | Good (parallel via Cypress Cloud; CLI-parallel limited) | Strong (huge plugin ecosystem) | High | Strong DX for component testing; runs inside-browser limits cross-origin and iframe scenarios. |
| **Selenium / WebdriverIO** | All browsers via WebDriver protocol | Real device via Appium | All major languages (Java / Python / C# / JS / Ruby) | Moderate (Selenium Grid; WDIO improves on Selenium's runner) | Mature (oldest ecosystem) | Highest (historical talent pool) | Mature but more flake-prone than Playwright: async-wait is the single largest flake category at 45% ([Luo et al. 2014](https://mir.cs.illinois.edu/marinov/publications/LuoETAL14FlakyTestsAnalysis.pdf)), and Selenium leaves that synchronization manual. Migration target, not greenfield default. |
| **TestCafe** | All browsers; proxy-based (no WebDriver) | Mobile via emulators | JS / TS | Moderate | Smaller ecosystem | Lower | Niche; integrated runner. |
| **Puppeteer** | Chrome and Firefox (stable Firefox from v23, [supported browsers](https://pptr.dev/supported-browsers)) | Limited | JS / TS | Good | Smaller than Playwright | Lower | Browser automation library rather than a test runner; pair it with Jest or similar. |

Decision tree for greenfield web E2E:
- **Multi-browser required + multi-language team** → Playwright.
- **Single-browser (Chromium) + JS-only team** → Playwright or Cypress; Cypress has stronger component-testing DX.
- **Legacy / migration off existing Selenium suite** → either incremental migration to Playwright (preferred) or modernise the Selenium suite via WebdriverIO's runner ergonomics.

## Step 3 - Framework tradeoff matrix (other test layers)

The per-layer matrices (mobile native, API / contract, performance)
are in [references/other-layers.md](references/other-layers.md). The
short rules:

- **Mobile:** single-platform native app → that platform's first-party
  framework (Espresso, XCUITest); both platforms with one suite →
  Appium; React Native → Detox.
- **API / contract:** JVM team → RestAssured; non-programmer authors →
  Karate or Postman / Newman; consumer-driven contracts are a separate
  decision (`pact-contract-testing`).
- **Performance:** pick the tool in the team's language (k6 for JS,
  Locust for Python, Gatling for JVM); JMeter when a GUI-built plan is
  already in place.

## Step 4 - Reference directory layouts

After the team has chosen a stack, adopt the canonical directory layout the per-framework skill assumes - a convention, not a mandate, but the starting point a newcomer can read. The layouts for Playwright + Jest, Cypress + Mocha, and Selenium / WebdriverIO are in [references/directory-layouts.md](references/directory-layouts.md).

## Step 5 - CI integration patterns

Universal across frameworks:

| Concern | Convention |
|---|---|
| **Parallelisation** | Shard by file (Playwright `--shard=X/Y`, Cypress Cloud, WDIO `maxInstances`). Aim for 5 - 10 minute wall-clock for the full suite per shard. |
| **Retries** | Retry once on first failure; never retry locally (only CI). Tests retried >1× are flake candidates - triage them. |
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

## Step 7 - Commercial vendors (procurement axis)

When the decision is a **commercial** tool - a test-management platform
(TestRail / Qase / Xray / Zephyr), a no-code automation vendor (mabl / Testim /
Functionize), a visual-regression service (Applitools / Percy / Chromatic), or
an AI copilot tier - the axes change: contract, lock-in, and exit cost matter
as much as capability. Run the seven-axis vendor evaluation (capability fit,
cost model, integration depth, lock-in risk, exit cost, contractual posture,
customer-reference data) in
[references/vendor-evaluation.md](references/vendor-evaluation.md). It emits
an evidence pack with a weighted score per the team's NFR order and
deliberately refuses to pick the winner - the team owns the procurement
choice.

## Step 8 - Record the decision

Whichever path produced the choice, write it down as a decision record so a
later reader can see the signal, the rejected alternative, and what would
reverse it. The ADR-based format - observed project signal, exactly one
primary recommendation, a why-not clause, one read-next link, and mandatory
flip conditions - is in
[references/decision-record-format.md](references/decision-record-format.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Picking the framework before the NFRs are scored | Choice driven by hype, not fit; high migration cost when the wrong framework can't deliver. | Step 1 - score the NFRs first. |
| Standardising on one framework across every test layer | Different layers need different tools (Playwright for E2E ≠ k6 for perf ≠ Pact for contract). | Pick per layer; the stack is multiple frameworks. |
| Picking Selenium for greenfield in 2026 | Manual async-wait is the dominant flake category at 45% ([Luo et al. 2014](https://mir.cs.illinois.edu/marinov/publications/LuoETAL14FlakyTestsAnalysis.pdf)), and Selenium does not auto-wait. | Use Playwright for greenfield; reserve Selenium for legacy maintenance. |
| Cross-language teams picking a single-language framework | Engineers can't contribute; suite becomes one person's domain. | Either pick a multi-language framework (Playwright / Selenium) or commit to retraining. |
| Adopting a framework because a contractor used it | Contractor leaves; team can't maintain. | Hire-ability is an NFR. |
| Skipping the directory-layout convention | Every newcomer authoring tests in a different shape; review burden grows. | Step 4 - pick a canonical layout up front, even if you deviate later. |
| Treating this skill as "framework recommender" rather than "decision support" | The skill recommends; the team decides. Automating the decision strips accountability. | The output of this skill is a documented choice, not an automatic install. |

## Limitations

- **Coverage is the web / mobile / API / perf canonical set.** Specialised layers (desktop apps via Spectron / Tauri, embedded devices, hardware-in-loop) are out of scope.
- **Tradeoff matrix is point-in-time (checked October 2026).** Frameworks change quickly; re-check each row against the framework's docs before a greenfield decision.
- **Tradeoffs are illustrative.** A specific product can have constraints that flip the recommendation - e.g., a Salesforce internal app where the legacy stack is JVM-only would override the "Playwright by default" guidance.
- **Hire-ability is geography-dependent.** "Hire-ability" assumes US / EU markets in the matrix; for other markets, the team's local pool is the authority.
- **No automated framework scaffolding.** Intentional: the output is a recorded decision. Use the per-framework skill after it.
- **Closed-platform comparison is a different axis.** Mabl / Testim / Functionize / TestSigma are no-code platforms; they compete with this entire category, not with one framework. The "code vs no-code" strategic call stays with the team; once the team is comparing commercial vendors, use the procurement workflow in [references/vendor-evaluation.md](references/vendor-evaluation.md).

## Hand-off targets

- **After the framework is chosen, configure it** → per-framework skill (`playwright-testing`, `cypress-testing`, `selenium-testing`, `webdriverio-testing`).
- **Record the choice** → [references/decision-record-format.md](references/decision-record-format.md).
- **Commercial-vendor procurement** → [references/vendor-evaluation.md](references/vendor-evaluation.md).
- **Tune the layer balance after the framework is in place** → `test-pyramid-balancer`.
- **Convert Selenium suite → Playwright** → migration is a project, not an agent; this skill provides the decision input, the per-framework skills provide the target configuration.

## References

- Playwright official documentation - locator hierarchy, trace viewer, parallel sharding: https://playwright.dev/
- Cypress documentation: https://docs.cypress.io/
- WebdriverIO documentation: https://webdriver.io/
- Martin Fowler - Page Object pattern (canonical definition): https://martinfowler.com/bliki/PageObject.html
- Luo et al., "An Empirical Analysis of Flaky Tests" (FSE 2014) - async-wait is the largest flake category (45%), the class Selenium leaves to manual synchronization: https://mir.cs.illinois.edu/marinov/publications/LuoETAL14FlakyTestsAnalysis.pdf
- Playwright actionability docs - built-in auto-waiting and auto-retrying assertions that remove a major Selenium flake source: https://playwright.dev/docs/actionability
- Playwright Android (experimental): https://playwright.dev/docs/api/class-android
- Cypress experiments (`experimentalWebKitSupport`): https://docs.cypress.io/app/references/experiments
- Puppeteer supported browsers: https://pptr.dev/supported-browsers
- [references/other-layers.md](references/other-layers.md) - mobile, API / contract, and performance matrices with their sources.
- ISTQB glossary - test automation framework: https://glossary.istqb.org/en_US/term/test-automation-framework
- ISTQB glossary - keyword-driven testing (relevant to Karate / Postman DSL choice): https://glossary.istqb.org/en_US/term/keyword-driven-testing
- ISO/IEC 25010 - quality characteristics (used in Step 1 NFR scoring): https://en.wikipedia.org/wiki/ISO/IEC_25010
- `playwright-testing`, `cypress-testing`, `selenium-testing`, `webdriverio-testing` - downstream per-framework configuration skills.
- `test-pyramid-balancer` - layer-mix tuning after the framework is in place.
