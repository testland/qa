---
name: web-e2e-getting-started
description: "Orients a junior engineer to web E2E testing in the qa-web-e2e plugin - maps the available skills and agents, routes framework choice through the right agent, and walks the three entry-point skills for first-time setup. Use when a junior engineer is new to web E2E and does not know where to start in this plugin."
rating: 22
d6: 2
---

# web-e2e-getting-started
## What is web E2E testing

Web end-to-end (E2E) testing exercises a web application the way a real user would: a browser is launched, pages are loaded, interactions are performed (clicks, form fills, navigations), and outcomes are asserted against what the user should see. Per [playwright.dev/docs/intro][pwi]: "Playwright Test is an end-to-end test framework for modern web apps. It bundles test runner, assertions, isolation, parallelization and rich tooling." E2E tests sit at the top of the testing pyramid - they are the most realistic but also the slowest and most resource-intensive layer, so they complement, rather than replace, unit and integration tests.

## Step 1 - Decide on a framework

If you are not sure which tool to use, run the `web-e2e-framework-selector` agent first. It reads your project (`package.json`, any existing config files) and recommends exactly one framework - Playwright, Cypress, Selenium, Puppeteer, TestCafe, or WebdriverIO - based on your stack. Skip this step only if the team has already committed to a framework.

## Step 2 - Three skills to start with

| Goal | Component | When to reach for it |
|------|-----------|---------------------|
| Scaffold and author your first tests | [`playwright-testing`](../playwright-testing/SKILL.md) | Greenfield project or no existing E2E suite. Playwright is the modern default for new web projects. |
| Generate a test skeleton from a user story | `spec-to-e2e-test-scaffolder` agent | You have a story or test-case row and want a clean scaffold with `// TODO` placeholders rather than raw codegen. |
| Make the test code team-ready | [`test-code-conventions`](../../../qa-test-review/skills/test-code-conventions/SKILL.md) | After authoring: enforce selector, naming, and structure conventions before the PR lands. |

Start with `playwright-testing` unless `web-e2e-framework-selector` sends you elsewhere.

## Step 3 - Your first commands

Per [playwright.dev/docs/intro][pwi]:

```bash
# 1. Scaffold - prompts for TypeScript/JS, tests folder, CI workflow, browser binaries
npm init playwright@latest

# 2. Run the generated example to confirm the install is healthy
npx playwright test
```

The init wizard creates `playwright.config.ts`, updates `package.json`, and writes `tests/example.spec.ts`. Running `npx playwright test` immediately after install runs the bundled example spec across Chromium, Firefox, and WebKit - all three should pass on a clean machine ([playwright.dev/docs/intro][pwi]).

After the example passes, open `tests/example.spec.ts`, read it, then follow `playwright-testing` for authoring your real tests.

## What is in this plugin

| Type | Name | Purpose |
|------|------|---------|
| Skill | `playwright-testing` | Author + run Playwright tests (Chromium, Firefox, WebKit) |
| Skill | `cypress-testing` | Author + run Cypress tests |
| Skill | `selenium-testing` | Author + run Selenium WebDriver tests |
| Skill | `webdriverio-testing` | Author + run WebdriverIO tests |
| Skill | `puppeteer-testing` | Chrome/Chromium browser automation with Puppeteer |
| Skill | `testcafe-testing` | Author + run TestCafe tests (no WebDriver) |
| Agent | `web-e2e-framework-selector` | Reads your project and recommends one framework |
| Agent | `spec-to-e2e-test-scaffolder` | Generates a test scaffold from a user story |
| Agent | `playwright-codegen-reviewer` | Refactors raw Playwright codegen output to Page Object Model |
| Agent | `cypress-codegen-reviewer` | Refactors raw Cypress Studio recordings to idiomatic Cypress |
| Agent | `selenium-grid-orchestrator` | Manages distributed Selenium runs across Grid / cloud farms |

## Hard-reject rule

Any revision to this skill that removes inline source citations from the commands or quoted text in "What is web E2E testing" makes the component a hard reject. All concrete claims about tool behavior must stay cited to [playwright.dev/docs/intro][pwi] at the point of use.

[pwi]: https://playwright.dev/docs/intro
