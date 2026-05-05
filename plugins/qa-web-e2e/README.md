# qa-web-e2e

Web E2E framework wrappers (per-framework S1 skills). Full lifecycle per framework: author + run + traces + flake debug + CI integration. Distinct from per-framework AGENTS (saturated by other repos) — this plugin ships skills focused on full lifecycle in one place. Plus two agents for codegen review and Selenium Grid orchestration.

## Components

| Type | Name | Archetype |
|---|---|---|
| skill | [playwright-testing](skills/playwright-testing/SKILL.md) | S1 |
| skill | [cypress-testing](skills/cypress-testing/SKILL.md) | S1 |
| skill | [selenium-testing](skills/selenium-testing/SKILL.md) | S1 |
| skill | [webdriverio-testing](skills/webdriverio-testing/SKILL.md) | S1 |
| skill | [puppeteer-testing](skills/puppeteer-testing/SKILL.md) | S1 |
| skill | [testcafe-testing](skills/testcafe-testing/SKILL.md) | S1 |
| agent | [playwright-codegen-reviewer](agents/playwright-codegen-reviewer.md) | A3 |
| agent | [selenium-grid-orchestrator](agents/selenium-grid-orchestrator.md) | A2 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-web-e2e@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
