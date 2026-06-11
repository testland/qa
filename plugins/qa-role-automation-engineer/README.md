# Test Automation Engineer (role bundle)

Test automation engineer role bundle: one-command install of web E2E, API testing, mobile automation, BDD, visual regression, CI integration, flake triage, test-code review, test data, and browser/OS compatibility.

Unlike the tech-domain bundles (`qa-role-frontend`, `qa-role-backend`), this bundle is organized around the **job role**: it covers an automation engineer's whole week — author and maintain automated suites across web, API, and mobile, wire them into CI, keep them stable (flake triage, quarantine, bisection), and keep the test code itself reviewable — regardless of which layer of the product you automate.

Installing this one plugin installs all 10 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-role-automation-engineer@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

- **qa-web-e2e** - Web E2E frameworks (Playwright, Cypress, Selenium, WebdriverIO, Puppeteer, TestCafe) + cloud grids
- **qa-api-testing** - API test automation (Postman/Newman, REST Assured, Karate, Tavern, fuzzing, chaos)
- **qa-mobile-native** - Mobile automation (XCUITest, Espresso, Appium, Detox, Maestro, Flutter)
- **qa-bdd** - BDD frameworks (Cucumber, Behave, Reqnroll) + Gherkin authoring
- **qa-visual-regression** - Visual regression (Percy, Chromatic, Playwright snapshots, Storybook)
- **qa-ci-integration** - CI test workflows (GitHub Actions, GitLab, Jenkins, CircleCI) + sharding/retry conventions
- **qa-flake-triage** - Flake patterns, bisection, isolation checking, quarantine, trend reporting
- **qa-test-review** - Test-code quality reviewers + object-model / isolation / step-design pattern catalogs
- **qa-test-data** - Test data generators, mock servers (WireMock, MSW, Mountebank), fixtures
- **qa-compatibility** - Browser/OS/device matrix strategy + Selenium Grid 4

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
