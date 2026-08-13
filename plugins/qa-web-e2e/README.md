# qa-web-e2e

Web E2E framework wrappers (per-framework skills). Full lifecycle per framework: author + run + traces + flake debug + CI integration. Cloud browser grids (BrowserStack / Sauce Labs / LambdaTest) live in one umbrella skill, and one agent reviews raw codegen recordings (Playwright codegen + Cypress Studio).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [web-e2e-overview](skills/web-e2e-overview/SKILL.md) | Teaches web E2E testing from first principles - what browser-driven E2E covers, a repo-observation decision table for choosing between Playwright, Cypress, Selenium, WebdriverIO and the cloud grids, first-run commands per tool, and the flakiness traps that sink new suites. |
| Skill | [playwright-testing](skills/playwright-testing/SKILL.md) | Authors Playwright E2E tests across Chromium, Firefox, WebKit - scaffolding, browser projects, accessibility-first locators, web-first assertions, Page Objects, trace viewer, sharding, mobile-web emulation via the `devices` catalog, CI integration. |
| Skill | [cypress-testing](skills/cypress-testing/SKILL.md) | Authors Cypress E2E tests - `npm install cypress`, `cypress.config.ts` setup, `cy.*` command chains, automatic-waiting commands, time-travel debugging, custom commands, CI integration. |
| Skill | [selenium-testing](skills/selenium-testing/SKILL.md) | Authors Selenium WebDriver tests in any of its 6+ supported languages (Java, Python, JavaScript, C#, Ruby, Kotlin, PHP) - picks the appropriate binding per project stack. |
| Skill | [webdriverio-testing](skills/webdriverio-testing/SKILL.md) | Authors WebdriverIO E2E tests - `npm init wdio@latest` scaffolding, services architecture (sauce, browserstack, appium, devtools), reporters, CI integration. |
| Skill | [cloud-grid-e2e](skills/cloud-grid-e2e/SKILL.md) | Author and run E2E tests on a cloud browser grid - BrowserStack Automate, Sauce Labs, or LambdaTest. One vendor-generic pattern (auth env vars, hub URL, vendor options dict, local tunnel, CI wiring) with per-vendor deltas in references/. |
| Agent | [playwright-codegen-reviewer](agents/playwright-codegen-reviewer.md) | Adversarial reviewer that takes raw recorded specs - Playwright codegen output or Cypress Studio recordings - and refactors them to team-ready idiomatic code (Page Objects / custom commands, accessibility-first selectors, retry-aware waits, AAA structure). |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-web-e2e@testland-qa
```
