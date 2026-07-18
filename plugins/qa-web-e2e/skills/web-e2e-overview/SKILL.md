---
name: web-e2e-overview
description: "Overview of web end-to-end testing for engineers new to it: compares the main frameworks (Playwright, Cypress, Selenium, WebdriverIO), helps choose one for the stack, and walks the first-time setup steps. Use when getting started with web E2E testing and choosing a framework."
---

# web-e2e-overview
## What is web E2E testing

Web end-to-end (E2E) testing exercises a web application the way a real user would: a browser is launched, pages are loaded, interactions are performed (clicks, form fills, navigations), and outcomes are asserted against what the user should see. Per [playwright.dev/docs/intro][pwi]: "Playwright Test is an end-to-end test framework for modern web apps. It bundles test runner, assertions, isolation, parallelization and rich tooling." E2E tests sit at the top of the testing pyramid - they are the most realistic but also the slowest and most resource-intensive layer, so they complement, rather than replace, unit and integration tests.

## Step 1 - Decide on a framework

If you are not sure which tool to use, pick based on your stack: Playwright is the modern default for new projects; stay with Cypress, Selenium, Puppeteer, TestCafe, or WebdriverIO if the team already uses one. Check your project (`package.json`, any existing config files) for a framework already in place before adding another.

## Step 2 - Three skills to start with

| Goal | Skill | When to reach for it |
|------|-----------|---------------------|
| Scaffold and author your first tests | [`playwright-testing`](../playwright-testing/SKILL.md) | Greenfield project or no existing E2E suite. Playwright is the modern default for new web projects. |
| Make the test code team-ready | `test-code-conventions` | After authoring: enforce selector, naming, and structure conventions before the PR lands. |

Start with `playwright-testing` unless your stack points elsewhere (see Step 1).

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

## Web E2E testing skills

| Name | Purpose |
|------|---------|
| `playwright-testing` | Author + run Playwright tests (Chromium, Firefox, WebKit) |
| `cypress-testing` | Author + run Cypress tests |
| `selenium-testing` | Author + run Selenium WebDriver tests |
| `webdriverio-testing` | Author + run WebdriverIO tests |
| `puppeteer-testing` | Chrome/Chromium browser automation with Puppeteer |
| `testcafe-testing` | Author + run TestCafe tests (no WebDriver) |

## Hard-reject rule

Any revision to this skill that removes inline source citations from the commands or quoted text in "What is web E2E testing" makes the component a hard reject. All concrete claims about tool behavior must stay cited to [playwright.dev/docs/intro][pwi] at the point of use.

[pwi]: https://playwright.dev/docs/intro
