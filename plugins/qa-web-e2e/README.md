# qa-web-e2e

Web E2E framework wrappers (per-framework skills). Full lifecycle per framework: author + run + traces + flake debug + CI integration. Plus two agents for codegen review and Selenium Grid orchestration.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [browserstack-automate](skills/browserstack-automate/SKILL.md) | Author and run E2E tests on BrowserStack Automate - cloud grid covering 3000+ real device + browser combinations. |
| Skill | [cypress-testing](skills/cypress-testing/SKILL.md) | Authors Cypress E2E tests - `npm install cypress`, `cypress.config.ts` setup, `cy.*` command chains, automatic-waiting commands, time-tra... |
| Skill | [web-e2e-getting-started](skills/web-e2e-getting-started/SKILL.md) | Orients a junior engineer to web E2E testing in the qa-web-e2e plugin - maps the available skills and agents, routes framework choice thr... |
| Skill | [lambdatest-automate](skills/lambdatest-automate/SKILL.md) | Author and run E2E tests on LambdaTest - cloud grid for cross-browser + real-device testing with W3C WebDriver, Cypress, Playwright, and... |
| Skill | [playwright-testing](skills/playwright-testing/SKILL.md) | Authors Playwright E2E tests across Chromium, Firefox, WebKit - `npm init playwright@latest` scaffolding, `playwright.config.ts` projects... |
| Skill | [puppeteer-testing](skills/puppeteer-testing/SKILL.md) | Authors browser automation scripts using Puppeteer - Chrome / Chromium-only headless / headed automation, Page object via `page.*` API, n... |
| Skill | [saucelabs-automate](skills/saucelabs-automate/SKILL.md) | Author and run E2E tests on Sauce Labs - cloud grid for cross-browser + real-device testing with W3C WebDriver, Cypress, Playwright, and... |
| Skill | [selenium-testing](skills/selenium-testing/SKILL.md) | Authors Selenium WebDriver tests in any of its 6+ supported languages (Java, Python, JavaScript, C#, Ruby, Kotlin, PHP) - picks the appro... |
| Skill | [testcafe-testing](skills/testcafe-testing/SKILL.md) | Authors TestCafe E2E tests - `npm install testcafe`, fixture/test syntax, `Selector` API for queries, automatic-waits, no WebDriver requi... |
| Skill | [webdriverio-testing](skills/webdriverio-testing/SKILL.md) | Authors WebdriverIO E2E tests - `npm init wdio@latest` scaffolding, services architecture (sauce, browserstack, appium, devtools), report... |
| Agent | [cypress-codegen-reviewer](agents/cypress-codegen-reviewer.md) | Adversarial reviewer that takes raw Cypress Studio or manually recorded specs and refactors them to idiomatic Cypress: extracts repeated... |
| Agent | [playwright-codegen-reviewer](agents/playwright-codegen-reviewer.md) | Adversarial reviewer that takes Playwright codegen output (raw recorded test code) and refactors it to idiomatic Page Object Model code -... |
| Agent | [selenium-grid-orchestrator](agents/selenium-grid-orchestrator.md) | Action-taking agent that manages distributed Selenium runs across local Selenium Grid (Docker), Sauce Labs, BrowserStack, and LambdaTest... |
| Agent | [spec-to-e2e-test-scaffolder](agents/spec-to-e2e-test-scaffolder.md) | Builder agent that takes a user story or test-case row plus a target framework (Playwright / Cypress / Selenium / WebdriverIO) and output... |
| Agent | [web-e2e-framework-selector](agents/web-e2e-framework-selector.md) | Action-taking agent that reads a target web app project (`package.json`, `playwright.config.*`, `cypress.config.*`, `wdio.conf.*`, `night... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-web-e2e@testland-qa
```
