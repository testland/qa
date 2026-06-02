# qa-web-e2e

Web E2E framework wrappers (per-framework skills). Full lifecycle per framework: author + run + traces + flake debug + CI integration. Plus two agents for codegen review and Selenium Grid orchestration.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [playwright-testing](skills/playwright-testing/SKILL.md) | S1 | Authors Playwright E2E tests across Chromium, Firefox, WebKit - `npm init playwright@latest` scaffolding, `playwright.config.ts` projects per browser/device, accessibility-first locators (`getByRole`/`getByLabelText` per the e2e-selector convention), Page Object pattern, trace viewer for debugging, parallel + sharded execution, HTML reporter for CI. Per Playwright''''s docs: \"an end-to-end test framework for modern web apps. It bundles test runner, assertions, isolation, parallelization and rich tooling. |
| Skill | [cypress-testing](skills/cypress-testing/SKILL.md) | S1 | Authors Cypress E2E tests - `npm install cypress`, `cypress.config.ts` setup, `cy.*` command chains, automatic-waiting commands, time-travel debugger via Cypress GUI, custom commands for reusable patterns, Cypress Cloud for parallel/recording. Per Cypress''''s positioning: \"fast, consistent and reliable tests that are flake-free\" via in-browser execution architecture. |
| Skill | [selenium-testing](skills/selenium-testing/SKILL.md) | S1 | Authors Selenium WebDriver tests in any of its 6+ supported languages (Java, Python, JavaScript, C#, Ruby, Kotlin, PHP) - picks the appropriate language binding, configures WebDriver per browser, uses `By.*` locators with the team's accessibility-first preference where supported, runs locally + via Selenium Grid for distributed execution, parses results to JUnit XML. Use for legacy Selenium-locked stacks; new projects pick Playwright or Cypress. |
| Skill | [webdriverio-testing](skills/webdriverio-testing/SKILL.md) | S1 | Authors WebdriverIO E2E tests - `npm init wdio@latest` scaffolding, services architecture (sauce, browserstack, appium, devtools), reporters (spec, allure, junit), built-in Mocha/Jasmine/Cucumber framework integrations. WebdriverIO sits between Selenium (W3C protocol) and Playwright (modern API) - Selenium-protocol-compatible with rich plugin ecosystem. Use when the team needs WebDriver protocol + service-based device-farm integration. |
| Skill | [puppeteer-testing](skills/puppeteer-testing/SKILL.md) | S1 | Authors browser automation scripts using Puppeteer - Chrome / Chromium-only headless / headed automation, Page object via `page.*` API, network interception, PDF generation, screenshot capture, scraping. Distinct from Playwright (Puppeteer's older sibling, Chrome-only) - use Puppeteer for Chrome-only browser automation tasks (scraping, generating PDFs from HTML, screenshot pipelines) where Playwright's multi-browser support is unneeded overhead. |
| Skill | [testcafe-testing](skills/testcafe-testing/SKILL.md) | S1 | Authors TestCafe E2E tests - `npm install testcafe`, fixture/test syntax, `Selector` API for queries, automatic-waits, no WebDriver required (TestCafe injects scripts via a proxy), supports any browser including remote / cloud farms. Use when the team prefers a no-WebDriver architecture and one of TestCafe's specific features (e.g., role-based auth) matters. |
| Agent | [playwright-codegen-reviewer](agents/playwright-codegen-reviewer.md) | A3 | Adversarial reviewer that takes Playwright codegen output (raw recorded test code) and refactors it to idiomatic Page Object Model code - extracts repeated selectors into constants, identifies common interactions worth Page Object methods, replaces brittle CSS selectors with `getByRole` accessibility-first equivalents per the convention, restructures the recorded sequence into AAA-pattern tests. Use after recording a flow with `npx playwright codegen`; the agent produces team-ready code from the raw recording. |
| Agent | [selenium-grid-orchestrator](agents/selenium-grid-orchestrator.md) | A2 | Action-taking agent that manages distributed Selenium runs across local Selenium Grid (Docker), Sauce Labs, BrowserStack, and LambdaTest - given a test suite and a target matrix, picks the appropriate provider per matrix combination, generates the per-target capabilities, schedules the run, aggregates results into a per-target verdict matrix. Use when a Selenium suite needs to run across many browser/OS combinations and the team doesn't want to manage the orchestration manually. |
| Agent | [spec-to-e2e-test-scaffolder](agents/spec-to-e2e-test-scaffolder.md) | A4 | Builder agent that takes a user story or test-case row plus a target framework (Playwright / Cypress / Selenium / WebdriverIO) and outputs an E2E test scaffold with explicit `// TODO` placeholders for selectors and assertions - never inventing locators, never asserting against fabricated DOM. Sibling of `playwright-codegen-reviewer` (which refines existing codegen output, downstream); this agent is upstream - it generates the scaffold to be reviewed. Always recommends `assertion-quality-reviewer` and `e2e-selector-quality-critic` (in qa-test-review) and `ai-test-shallow-coverage-critic` (in qa-ai-assisted) as required downstream gates. Use when starting a new E2E test from a story or matrix row and the team wants a clean skeleton instead of dropping into raw codegen. |
| Agent | [web-e2e-framework-selector](agents/web-e2e-framework-selector.md) | A2 | Action-taking agent that reads a target web app project (`package.json`, `playwright.config.*`, `cypress.config.*`, `wdio.conf.*`, `nightwatch.conf.*`, existing E2E directory) and recommends ONE E2E framework - Playwright, Cypress, Selenium, Puppeteer, TestCafe, WebdriverIO - plus the cloud runner (BrowserStack / Sauce Labs / LambdaTest) when cross-browser matrix coverage is needed. Distinct from `qa-process/framework-choice-advisor` (S2 reference catalog laying out trade-offs in prose). Use when starting a new E2E test project and the team has not yet committed to a framework. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-web-e2e@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
